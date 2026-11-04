/// Per-user agent vault for trading Blast launches.
///
/// Custody model:
/// - The user holds an `OwnerCap`. It can deposit, withdraw, change limits, pause, revoke and
///   re-authorize. Owner functions never check `paused` or the agent state, so the owner can
///   always withdraw.
/// - The operator (our backend) holds a `TradeCap`. It can call `buy` and `sell`, which only move
///   value between `vault.sui` and `vault.tokens` through a Blast curve, and `charge_fee`. No
///   function that takes a `TradeCap` returns a `Coin` or a `Balance`.
/// - The daily fee (SPEC 1b) is the only way SUI leaves the vault other than to the owner: at most
///   `daily_fee_cap`, at most once per calendar day, only to the `treasury` the owner approved,
///   never while paused or revoked, and never during the free period set at creation.
/// - Hard caps (per trade, per launch, per day, open positions, non-zero `min_out`) are enforced
///   here, on-chain. The drawdown stop is enforced off-chain by the operator (SPEC 5.4.4).
module blast_agent_vault::vault;

use blast_fun::blast_fun::PackageVersion;
use blast_fun::launch::{Self, Launch};
use blast_fun::runtime_config::RuntimeConfig;
use std::type_name::{Self, TypeName};
use sui::bag::{Self, Bag};
use sui::balance::{Self, Balance};
use sui::clock::Clock;
use sui::coin::{Self, Coin};
use sui::event;
use sui::sui::SUI;
use sui::table::{Self, Table};

// === Errors ===

/// The capability belongs to a different vault.
const EWrongVault: u64 = 0;
/// The TradeCap is not the vault's current agent (revoked or replaced).
const EAgentNotAuthorized: u64 = 1;
/// The owner paused agent trading.
const EPaused: u64 = 2;
/// Trade amount must be above zero.
const EZeroAmount: u64 = 3;
/// `min_out` must be above zero (slippage protection is mandatory).
const EZeroMinOut: u64 = 4;
/// Buy is larger than `max_trade`.
const EExceedsMaxTrade: u64 = 5;
/// Buy would take SUI spent on this launch over `max_per_launch`.
const EExceedsMaxPerLaunch: u64 = 6;
/// Buy would take today's spend over `max_daily_spend`.
const EExceedsDailySpend: u64 = 7;
/// Buy would open a position beyond `max_open_positions`.
const ETooManyOpenPositions: u64 = 8;
/// Not enough SUI in the vault.
const EInsufficientSui: u64 = 9;
/// Not enough of that token in the vault.
const EInsufficientTokens: u64 = 10;
/// Limits are invalid (v1 requires `min_out_required = true`).
const EInvalidLimits: u64 = 11;
/// The trade returned less than `min_out`.
const EOutputBelowMin: u64 = 12;
/// SUI goes through the SUI functions, never the token bag.
const ESuiIsNotAToken: u64 = 13;
/// The fee for today was already charged, or today is still in the free period.
const EFeeNotDue: u64 = 14;
/// Fee is above `daily_fee_cap`.
const EExceedsDailyFeeCap: u64 = 15;

// === Constants ===

const MS_PER_DAY: u64 = 86_400_000;
const SIDE_BUY: u8 = 0;
const SIDE_SELL: u8 = 1;

// === Objects ===

public struct AgentVault has key {
    id: UID,
    /// Informational: the creator. Authority is the OwnerCap.
    owner: address,
    /// `none` = revoked / no agent.
    trade_cap_id: Option<ID>,
    paused: bool,
    limits: Limits,
    sui: Balance<SUI>,
    /// `TypeName` -> `Balance<T>`, only non-zero balances are kept.
    tokens: Bag,
    /// `clock_ms / 86_400_000` of the last buy.
    day_index: u64,
    spent_today: u64,
    /// Net SUI spent per Meme type that is still held (reduced pro rata on sells/withdrawals).
    position_cost: Table<TypeName, u64>,
    /// Number of token types in `tokens`.
    open_positions: u64,
    /// Most SUI (MIST) `charge_fee` may take per calendar day. Approved by the owner.
    daily_fee_cap: u64,
    /// The only address `charge_fee` pays. Approved by the owner.
    treasury: address,
    /// Last day already paid for, or covered by the free period. A fee is due when today is later.
    last_fee_day: u64,
}

public struct Limits has copy, drop, store {
    max_trade: u64,
    max_per_launch: u64,
    max_daily_spend: u64,
    max_open_positions: u64,
    min_out_required: bool,
}

public struct OwnerCap has key, store { id: UID, vault_id: ID }

public struct TradeCap has key, store { id: UID, vault_id: ID }

/// Hot potato tying the two halves of a buy together inside one call.
public struct BuyTicket {
    vault_id: ID,
    meme: TypeName,
    amount: u64,
    min_out: u64,
}

/// Hot potato tying the two halves of a sell together inside one call.
public struct SellTicket {
    vault_id: ID,
    meme: TypeName,
    amount: u64,
    min_out: u64,
}

// === Events ===

public struct VaultCreated has copy, drop {
    vault_id: ID,
    owner: address,
    operator: address,
    limits: Limits,
    daily_fee_cap: u64,
    treasury: address,
    /// First day a fee can be charged.
    first_fee_day: u64,
}

public struct Deposited has copy, drop { vault_id: ID, coin_type: TypeName, amount: u64 }

public struct Withdrawn has copy, drop { vault_id: ID, coin_type: TypeName, amount: u64, recipient: address }

public struct LimitsChanged has copy, drop { vault_id: ID, limits: Limits }

public struct Paused has copy, drop { vault_id: ID }

public struct Resumed has copy, drop { vault_id: ID }

public struct AgentAuthorized has copy, drop { vault_id: ID, trade_cap_id: ID, operator: address }

public struct AgentRevoked has copy, drop { vault_id: ID, trade_cap_id: Option<ID> }

public struct FeeTermsChanged has copy, drop { vault_id: ID, daily_fee_cap: u64, treasury: address }

public struct FeeCharged has copy, drop { vault_id: ID, amount: u64, day: u64, treasury: address }

/// `side`: 0 = buy, 1 = sell. `sui_amount` is net SUI spent (buy, after refund) or received (sell).
public struct AgentTraded has copy, drop {
    vault_id: ID,
    meme_type: TypeName,
    side: u8,
    sui_amount: u64,
    meme_amount: u64,
    min_out: u64,
}

// === Limits ===

public fun new_limits(
    max_trade: u64,
    max_per_launch: u64,
    max_daily_spend: u64,
    max_open_positions: u64,
    min_out_required: bool,
): Limits {
    let limits = Limits { max_trade, max_per_launch, max_daily_spend, max_open_positions, min_out_required };
    assert_valid_limits(&limits);
    limits
}

fun assert_valid_limits(limits: &Limits) {
    assert!(limits.min_out_required, EInvalidLimits);
}

// === Owner functions (OwnerCap) ===

/// The single "Start" call (SPEC 1b): creates and shares a vault funded with `coin`, writes the
/// limits and the fee terms, sends a TradeCap to `operator`, and returns the OwnerCap (the PTB
/// transfers it to the user). No fee can be charged for `free_days` calendar days, starting today.
public fun create(
    limits: Limits,
    daily_fee_cap: u64,
    treasury: address,
    free_days: u64,
    coin: Coin<SUI>,
    operator: address,
    clock: &Clock,
    ctx: &mut TxContext,
): OwnerCap {
    assert_valid_limits(&limits);
    let today = clock.timestamp_ms() / MS_PER_DAY;
    // Fees are due from day `today + free_days`. Sui's clock is far past day 0, so this never
    // underflows on a real network.
    let last_fee_day = today + free_days - 1;
    let mut vault = AgentVault {
        id: object::new(ctx),
        owner: ctx.sender(),
        trade_cap_id: option::none(),
        paused: false,
        limits,
        sui: balance::zero(),
        tokens: bag::new(ctx),
        day_index: clock.timestamp_ms() / MS_PER_DAY,
        spent_today: 0,
        position_cost: table::new(ctx),
        open_positions: 0,
        daily_fee_cap,
        treasury,
        last_fee_day,
    };
    let vault_id = object::id(&vault);
    event::emit(VaultCreated {
        vault_id,
        owner: ctx.sender(),
        operator,
        limits,
        daily_fee_cap,
        treasury,
        first_fee_day: last_fee_day + 1,
    });

    let owner_cap = OwnerCap { id: object::new(ctx), vault_id };
    vault.deposit_sui(&owner_cap, coin);
    vault.authorize_agent(&owner_cap, operator, ctx);
    transfer::share_object(vault);
    owner_cap
}

public fun deposit_sui(vault: &mut AgentVault, cap: &OwnerCap, coin: Coin<SUI>) {
    vault.assert_owner(cap);
    let amount = coin.value();
    vault.sui.join(coin.into_balance());
    event::emit(Deposited { vault_id: object::id(vault), coin_type: type_name::with_defining_ids<SUI>(), amount });
}

public fun deposit_token<T>(vault: &mut AgentVault, cap: &OwnerCap, coin: Coin<T>) {
    vault.assert_owner(cap);
    let key = type_name::with_defining_ids<T>();
    assert!(key != type_name::with_defining_ids<SUI>(), ESuiIsNotAToken);
    let amount = coin.value();
    vault.add_token(key, coin.into_balance());
    event::emit(Deposited { vault_id: object::id(vault), coin_type: key, amount });
}

/// Always works: not gated on pause, revoke or limits.
public fun withdraw_sui(vault: &mut AgentVault, cap: &OwnerCap, amount: u64, ctx: &mut TxContext): Coin<SUI> {
    vault.assert_owner(cap);
    assert!(amount <= vault.sui.value(), EInsufficientSui);
    event::emit(Withdrawn {
        vault_id: object::id(vault),
        coin_type: type_name::with_defining_ids<SUI>(),
        amount,
        recipient: ctx.sender(),
    });
    coin::from_balance(vault.sui.split(amount), ctx)
}

public fun withdraw_all_sui(vault: &mut AgentVault, cap: &OwnerCap, ctx: &mut TxContext): Coin<SUI> {
    let amount = vault.sui.value();
    vault.withdraw_sui(cap, amount, ctx)
}

/// Always works: not gated on pause, revoke or limits.
public fun withdraw_token<T>(vault: &mut AgentVault, cap: &OwnerCap, amount: u64, ctx: &mut TxContext): Coin<T> {
    vault.assert_owner(cap);
    let key = type_name::with_defining_ids<T>();
    let out = vault.take_token<T>(key, amount);
    event::emit(Withdrawn { vault_id: object::id(vault), coin_type: key, amount, recipient: ctx.sender() });
    coin::from_balance(out, ctx)
}

public fun withdraw_all_token<T>(vault: &mut AgentVault, cap: &OwnerCap, ctx: &mut TxContext): Coin<T> {
    let amount = vault.token_value<T>();
    vault.withdraw_token<T>(cap, amount, ctx)
}

public fun set_limits(vault: &mut AgentVault, cap: &OwnerCap, limits: Limits) {
    vault.assert_owner(cap);
    assert_valid_limits(&limits);
    vault.limits = limits;
    event::emit(LimitsChanged { vault_id: object::id(vault), limits });
}

public fun pause(vault: &mut AgentVault, cap: &OwnerCap) {
    vault.assert_owner(cap);
    vault.paused = true;
    event::emit(Paused { vault_id: object::id(vault) });
}

public fun resume(vault: &mut AgentVault, cap: &OwnerCap) {
    vault.assert_owner(cap);
    vault.paused = false;
    event::emit(Resumed { vault_id: object::id(vault) });
}

/// Changes the fee terms. Owner only: a fee change applies only once the owner re-approves it.
public fun set_fee_terms(vault: &mut AgentVault, cap: &OwnerCap, daily_fee_cap: u64, treasury: address) {
    vault.assert_owner(cap);
    vault.daily_fee_cap = daily_fee_cap;
    vault.treasury = treasury;
    event::emit(FeeTermsChanged { vault_id: object::id(vault), daily_fee_cap, treasury });
}

/// Instant kill: every later call with the old TradeCap aborts.
public fun revoke_agent(vault: &mut AgentVault, cap: &OwnerCap) {
    vault.assert_owner(cap);
    let previous = vault.trade_cap_id;
    vault.trade_cap_id = option::none();
    event::emit(AgentRevoked { vault_id: object::id(vault), trade_cap_id: previous });
}

/// Mints a new TradeCap for `operator`. Any previous TradeCap stops working.
public fun authorize_agent(vault: &mut AgentVault, cap: &OwnerCap, operator: address, ctx: &mut TxContext) {
    vault.assert_owner(cap);
    let vault_id = object::id(vault);
    let trade_cap = TradeCap { id: object::new(ctx), vault_id };
    let trade_cap_id = object::id(&trade_cap);
    vault.trade_cap_id = option::some(trade_cap_id);
    event::emit(AgentAuthorized { vault_id, trade_cap_id, operator });
    transfer::public_transfer(trade_cap, operator);
}

/// Lets the operator clean up a TradeCap it no longer needs.
public fun destroy_trade_cap(cap: TradeCap) {
    let TradeCap { id, vault_id: _ } = cap;
    id.delete();
}

// === Agent functions (TradeCap) ===

/// Spends `amount` SUI from the vault on a Blast curve. Meme and any refund stay in the vault.
public fun buy<Meme>(
    vault: &mut AgentVault,
    cap: &TradeCap,
    launch: &mut Launch<Meme, SUI>,
    package_version: &PackageVersion,
    runtime_config: &RuntimeConfig,
    amount: u64,
    min_meme_out: u64,
    clock: &Clock,
    ctx: &mut TxContext,
) {
    let (quote_in, ticket) = vault.begin_buy<Meme>(cap, amount, min_meme_out, clock);
    let (meme_out, refund) = launch::buy(
        launch,
        package_version,
        runtime_config,
        coin::from_balance(quote_in, ctx),
        min_meme_out,
        ctx,
    );
    vault.finish_buy<Meme>(ticket, meme_out.into_balance(), refund.into_balance());
}

/// Sells `amount` Meme from the vault into its Blast curve. The SUI goes into the vault.
public fun sell<Meme>(
    vault: &mut AgentVault,
    cap: &TradeCap,
    launch: &mut Launch<Meme, SUI>,
    package_version: &PackageVersion,
    runtime_config: &RuntimeConfig,
    amount: u64,
    min_quote_out: u64,
    ctx: &mut TxContext,
) {
    let (meme_in, ticket) = vault.begin_sell<Meme>(cap, amount, min_quote_out);
    let quote_out = launch::sell(
        launch,
        package_version,
        runtime_config,
        coin::from_balance(meme_in, ctx),
        min_quote_out,
        ctx,
    );
    vault.finish_sell(ticket, quote_out.into_balance());
}

/// Pays the daily fee: at most `daily_fee_cap`, at most once per calendar day, only to
/// `vault.treasury`. Aborts while paused or revoked, during the free period, or if the vault holds
/// too little SUI (the operator then stops the agent and tells the user; it never sells to pay).
public fun charge_fee(vault: &mut AgentVault, cap: &TradeCap, amount: u64, clock: &Clock, ctx: &mut TxContext) {
    vault.assert_agent(cap);
    assert!(amount > 0, EZeroAmount);
    assert!(amount <= vault.daily_fee_cap, EExceedsDailyFeeCap);
    let today = clock.timestamp_ms() / MS_PER_DAY;
    assert!(today > vault.last_fee_day, EFeeNotDue);
    assert!(amount <= vault.sui.value(), EInsufficientSui);

    vault.last_fee_day = today;
    let treasury = vault.treasury;
    event::emit(FeeCharged { vault_id: object::id(vault), amount, day: today, treasury });
    transfer::public_transfer(coin::from_balance(vault.sui.split(amount), ctx), treasury);
}

// === Agent internals (package only; split so every limit can be unit-tested) ===

/// Checks the agent and every buy limit, then takes `amount` SUI out for the curve.
public(package) fun begin_buy<Meme>(
    vault: &mut AgentVault,
    cap: &TradeCap,
    amount: u64,
    min_out: u64,
    clock: &Clock,
): (Balance<SUI>, BuyTicket) {
    vault.assert_agent(cap);
    assert!(amount > 0, EZeroAmount);
    assert!(!vault.limits.min_out_required || min_out > 0, EZeroMinOut);
    assert!(amount <= vault.limits.max_trade, EExceedsMaxTrade);

    let today = clock.timestamp_ms() / MS_PER_DAY;
    if (today != vault.day_index) {
        vault.day_index = today;
        vault.spent_today = 0;
    };
    assert!(vault.spent_today + amount <= vault.limits.max_daily_spend, EExceedsDailySpend);

    let meme = type_name::with_defining_ids<Meme>();
    assert!(vault.position_cost_of(meme) + amount <= vault.limits.max_per_launch, EExceedsMaxPerLaunch);
    if (!vault.tokens.contains(meme)) {
        assert!(vault.open_positions < vault.limits.max_open_positions, ETooManyOpenPositions);
    };
    assert!(amount <= vault.sui.value(), EInsufficientSui);

    let ticket = BuyTicket { vault_id: object::id(vault), meme, amount, min_out };
    (vault.sui.split(amount), ticket)
}

/// Puts the bought Meme and the refund back into the vault and records the net spend.
public(package) fun finish_buy<Meme>(
    vault: &mut AgentVault,
    ticket: BuyTicket,
    meme_out: Balance<Meme>,
    refund: Balance<SUI>,
) {
    let BuyTicket { vault_id, meme, amount, min_out } = ticket;
    assert!(vault_id == object::id(vault), EWrongVault);
    assert!(meme == type_name::with_defining_ids<Meme>(), EWrongVault);
    let meme_amount = meme_out.value();
    assert!(meme_amount >= min_out && meme_amount > 0, EOutputBelowMin);

    let net = amount - refund.value();
    vault.sui.join(refund);
    vault.spent_today = vault.spent_today + net;
    let cost = vault.position_cost_of(meme) + net;
    vault.set_position_cost(meme, cost);
    vault.add_token(meme, meme_out);

    event::emit(AgentTraded { vault_id, meme_type: meme, side: SIDE_BUY, sui_amount: net, meme_amount, min_out });
}

/// Checks the agent, then takes `amount` Meme out for the curve.
public(package) fun begin_sell<Meme>(
    vault: &mut AgentVault,
    cap: &TradeCap,
    amount: u64,
    min_out: u64,
): (Balance<Meme>, SellTicket) {
    vault.assert_agent(cap);
    assert!(amount > 0, EZeroAmount);
    assert!(!vault.limits.min_out_required || min_out > 0, EZeroMinOut);
    let meme = type_name::with_defining_ids<Meme>();
    let meme_in = vault.take_token<Meme>(meme, amount);
    (meme_in, SellTicket { vault_id: object::id(vault), meme, amount, min_out })
}

/// Puts the SUI from a sell into the vault.
public(package) fun finish_sell(vault: &mut AgentVault, ticket: SellTicket, quote_out: Balance<SUI>) {
    let SellTicket { vault_id, meme, amount, min_out } = ticket;
    assert!(vault_id == object::id(vault), EWrongVault);
    let sui_amount = quote_out.value();
    assert!(sui_amount >= min_out, EOutputBelowMin);
    vault.sui.join(quote_out);
    event::emit(AgentTraded { vault_id, meme_type: meme, side: SIDE_SELL, sui_amount, meme_amount: amount, min_out });
}

// === Private helpers ===

fun assert_owner(vault: &AgentVault, cap: &OwnerCap) {
    assert!(cap.vault_id == object::id(vault), EWrongVault);
}

fun assert_agent(vault: &AgentVault, cap: &TradeCap) {
    assert!(cap.vault_id == object::id(vault), EWrongVault);
    assert!(vault.trade_cap_id == option::some(object::id(cap)), EAgentNotAuthorized);
    assert!(!vault.paused, EPaused);
}

fun add_token<T>(vault: &mut AgentVault, key: TypeName, value: Balance<T>) {
    if (value.value() == 0) {
        value.destroy_zero();
        return
    };
    if (vault.tokens.contains(key)) {
        let held: &mut Balance<T> = &mut vault.tokens[key];
        held.join(value);
    } else {
        vault.tokens.add(key, value);
        vault.open_positions = vault.open_positions + 1;
    }
}

/// Removes `amount` of `T`, reducing the position's cost pro rata; closes it at zero.
fun take_token<T>(vault: &mut AgentVault, key: TypeName, amount: u64): Balance<T> {
    assert!(vault.tokens.contains(key), EInsufficientTokens);
    let held: &mut Balance<T> = &mut vault.tokens[key];
    let before = held.value();
    assert!(amount <= before, EInsufficientTokens);
    let out = held.split(amount);
    let remaining = before - amount;
    if (remaining == 0) {
        let empty: Balance<T> = vault.tokens.remove(key);
        empty.destroy_zero();
        vault.open_positions = vault.open_positions - 1;
        if (vault.position_cost.contains(key)) { vault.position_cost.remove(key); };
    } else {
        let cost = vault.position_cost_of(key);
        let reduced = (((cost as u128) * (remaining as u128)) / (before as u128)) as u64;
        vault.set_position_cost(key, reduced);
    };
    out
}

fun position_cost_of(vault: &AgentVault, key: TypeName): u64 {
    if (vault.position_cost.contains(key)) *vault.position_cost.borrow(key) else 0
}

fun set_position_cost(vault: &mut AgentVault, key: TypeName, cost: u64) {
    if (vault.position_cost.contains(key)) {
        *vault.position_cost.borrow_mut(key) = cost;
    } else {
        vault.position_cost.add(key, cost);
    }
}

// === Getters ===

public fun owner(vault: &AgentVault): address { vault.owner }

public fun trade_cap_id(vault: &AgentVault): Option<ID> { vault.trade_cap_id }

public fun is_paused(vault: &AgentVault): bool { vault.paused }

public fun limits(vault: &AgentVault): Limits { vault.limits }

public fun sui_value(vault: &AgentVault): u64 { vault.sui.value() }

public fun token_value<T>(vault: &AgentVault): u64 {
    let key = type_name::with_defining_ids<T>();
    if (vault.tokens.contains(key)) {
        let held: &Balance<T> = &vault.tokens[key];
        held.value()
    } else 0
}

public fun position_cost<T>(vault: &AgentVault): u64 {
    vault.position_cost_of(type_name::with_defining_ids<T>())
}

public fun open_positions(vault: &AgentVault): u64 { vault.open_positions }

public fun day_index(vault: &AgentVault): u64 { vault.day_index }

/// Spend recorded for `day_index`; a later day starts from zero.
public fun spent_today(vault: &AgentVault): u64 { vault.spent_today }

public fun daily_fee_cap(vault: &AgentVault): u64 { vault.daily_fee_cap }

public fun treasury(vault: &AgentVault): address { vault.treasury }

/// A fee can be charged on any day after this one.
public fun last_fee_day(vault: &AgentVault): u64 { vault.last_fee_day }

public fun owner_cap_vault_id(cap: &OwnerCap): ID { cap.vault_id }

public fun trade_cap_vault_id(cap: &TradeCap): ID { cap.vault_id }

public fun max_trade(limits: &Limits): u64 { limits.max_trade }

public fun max_per_launch(limits: &Limits): u64 { limits.max_per_launch }

public fun max_daily_spend(limits: &Limits): u64 { limits.max_daily_spend }

public fun max_open_positions(limits: &Limits): u64 { limits.max_open_positions }

public fun min_out_required(limits: &Limits): bool { limits.min_out_required }
