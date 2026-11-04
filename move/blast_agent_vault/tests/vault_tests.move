#[test_only, allow(lint(abort_without_constant))]
module blast_agent_vault::vault_tests;

use blast_agent_vault::vault::{Self, AgentVault, OwnerCap, TradeCap, Limits};
use std::unit_test::{assert_eq, destroy};
use sui::balance;
use sui::clock::{Self, Clock};
use sui::coin::{Self, Coin};
use sui::sui::SUI;
use sui::test_scenario::{Self as ts, Scenario};

public struct MEME_A has drop {}
public struct MEME_B has drop {}
public struct MEME_C has drop {}

const USER: address = @0xA11CE;
const OPERATOR: address = @0x0BE;
const STRANGER: address = @0xBAD;
const TREASURY: address = @0x7EA;

const ONE: u64 = 1_000_000_000;
const DAY_MS: u64 = 86_400_000;
const FEE_CAP: u64 = 200_000_000; // 0.2 SUI a day
const FREE_DAYS: u64 = 7;
const BOTH_VENUES: u8 = 3;

// Limits used by most tests: 5 / 15 / 30 ONE, 2 open positions.
fun default_limits(): Limits { vault::new_limits(5 * ONE, 15 * ONE, 30 * ONE, 2, true) }

/// Creates a vault funded with `deposit` SUI. Leaves the scenario at a fresh tx from USER.
fun setup(deposit: u64): (Scenario, Clock) { setup_with_free_days(deposit, FREE_DAYS) }

/// Vault created on day 10 with the given free period.
fun setup_with_free_days(deposit: u64, free_days: u64): (Scenario, Clock) {
    let mut scenario = ts::begin(USER);
    let mut clock = clock::create_for_testing(scenario.ctx());
    clock.set_for_testing(10 * DAY_MS);
    let owner_cap = vault::create(
        default_limits(),
        FEE_CAP,
        TREASURY,
        free_days,
        BOTH_VENUES,
        coin::mint_for_testing<SUI>(deposit, scenario.ctx()),
        OPERATOR,
        &clock,
        scenario.ctx(),
    );
    transfer::public_transfer(owner_cap, USER);
    scenario.next_tx(USER);
    (scenario, clock)
}

/// Runs a buy through the vault's real checks, simulating the curve: `meme_out` tokens come back
/// and `refund` ONE is returned (as Blast does past the graduation target).
fun buy<Meme>(
    v: &mut AgentVault,
    cap: &TradeCap,
    amount: u64,
    min_out: u64,
    meme_out: u64,
    refund: u64,
    clock: &Clock,
) {
    let (mut quote_in, ticket) = v.begin_buy<Meme>(cap, vault::venue_blast(), amount, min_out, clock);
    let refund_balance = quote_in.split(refund);
    balance::destroy_for_testing(quote_in); // "the curve" keeps the spent ONE
    v.finish_buy<Meme>(ticket, balance::create_for_testing<Meme>(meme_out), refund_balance);
}

fun sell<Meme>(v: &mut AgentVault, cap: &TradeCap, amount: u64, min_out: u64, sui_out: u64) {
    let (meme_in, ticket) = v.begin_sell<Meme>(cap, amount, min_out);
    balance::destroy_for_testing(meme_in);
    v.finish_sell(ticket, balance::create_for_testing<SUI>(sui_out));
}

fun take(scenario: &Scenario): (AgentVault, OwnerCap, TradeCap) {
    let v = scenario.take_shared<AgentVault>();
    let owner_cap = scenario.take_from_address<OwnerCap>(USER);
    let trade_cap = scenario.take_from_address<TradeCap>(OPERATOR);
    (v, owner_cap, trade_cap)
}

fun give_back(v: AgentVault, owner_cap: OwnerCap, trade_cap: TradeCap) {
    ts::return_shared(v);
    ts::return_to_address(USER, owner_cap);
    ts::return_to_address(OPERATOR, trade_cap);
}

fun finish(scenario: Scenario, clock: Clock) {
    clock.destroy_for_testing();
    scenario.end();
}

// === Creation ===

#[test]
fun create_shares_vault_and_hands_out_caps() {
    let (scenario, clock) = setup(100 * ONE);
    let (v, owner_cap, trade_cap) = take(&scenario);
    assert_eq!(v.sui_value(), 100 * ONE);
    assert_eq!(v.owner(), USER);
    assert_eq!(v.trade_cap_id(), option::some(object::id(&trade_cap)));
    assert_eq!(owner_cap.owner_cap_vault_id(), object::id(&v));
    assert_eq!(trade_cap.trade_cap_vault_id(), object::id(&v));
    assert!(!v.is_paused());
    assert_eq!(v.open_positions(), 0);
    assert_eq!(v.day_index(), 10);
    give_back(v, owner_cap, trade_cap);
    finish(scenario, clock);
}

#[test, expected_failure(abort_code = vault::EInvalidLimits)]
fun limits_without_min_out_are_rejected() {
    vault::new_limits(1, 1, 1, 1, false);
}

// === Buy limits ===

#[test]
fun buy_records_net_spend_cost_and_position() {
    let (scenario, clock) = setup(100 * ONE);
    let (mut v, owner_cap, trade_cap) = take(&scenario);
    buy<MEME_A>(&mut v, &trade_cap, 5 * ONE, 1_000, 2_000, ONE, &clock);
    assert_eq!(v.sui_value(), 96 * ONE); // 5 out, 1 refunded
    assert_eq!(v.token_value<MEME_A>(), 2_000);
    assert_eq!(v.position_cost<MEME_A>(), 4 * ONE);
    assert_eq!(v.spent_today(), 4 * ONE);
    assert_eq!(v.open_positions(), 1);
    give_back(v, owner_cap, trade_cap);
    finish(scenario, clock);
}

#[test]
fun buy_at_exactly_max_trade_passes() {
    let (scenario, clock) = setup(100 * ONE);
    let (mut v, owner_cap, trade_cap) = take(&scenario);
    buy<MEME_A>(&mut v, &trade_cap, 5 * ONE, 1, 1, 0, &clock);
    give_back(v, owner_cap, trade_cap);
    finish(scenario, clock);
}

#[test, expected_failure(abort_code = vault::EExceedsMaxTrade)]
fun buy_above_max_trade_aborts() {
    let (scenario, clock) = setup(100 * ONE);
    let (mut v, _owner_cap, trade_cap) = take(&scenario);
    buy<MEME_A>(&mut v, &trade_cap, 5 * ONE + 1, 1, 1, 0, &clock);
    abort 99
}

#[test]
fun buy_up_to_exactly_max_per_launch_passes() {
    let (scenario, clock) = setup(100 * ONE);
    let (mut v, owner_cap, trade_cap) = take(&scenario);
    buy<MEME_A>(&mut v, &trade_cap, 5 * ONE, 1, 1, 0, &clock);
    buy<MEME_A>(&mut v, &trade_cap, 5 * ONE, 1, 1, 0, &clock);
    buy<MEME_A>(&mut v, &trade_cap, 5 * ONE, 1, 1, 0, &clock);
    assert_eq!(v.position_cost<MEME_A>(), 15 * ONE);
    give_back(v, owner_cap, trade_cap);
    finish(scenario, clock);
}

#[test, expected_failure(abort_code = vault::EExceedsMaxPerLaunch)]
fun buy_above_max_per_launch_aborts() {
    let (scenario, clock) = setup(100 * ONE);
    let (mut v, _owner_cap, trade_cap) = take(&scenario);
    buy<MEME_A>(&mut v, &trade_cap, 5 * ONE, 1, 1, 0, &clock);
    buy<MEME_A>(&mut v, &trade_cap, 5 * ONE, 1, 1, 0, &clock);
    buy<MEME_A>(&mut v, &trade_cap, 5 * ONE, 1, 1, 0, &clock);
    buy<MEME_A>(&mut v, &trade_cap, 1, 1, 1, 0, &clock);
    abort 99
}

#[test]
fun refund_does_not_count_toward_per_launch_cap() {
    let (scenario, clock) = setup(100 * ONE);
    let (mut v, owner_cap, trade_cap) = take(&scenario);
    buy<MEME_A>(&mut v, &trade_cap, 5 * ONE, 1, 1, 0, &clock);
    buy<MEME_A>(&mut v, &trade_cap, 5 * ONE, 1, 1, 0, &clock);
    buy<MEME_A>(&mut v, &trade_cap, 5 * ONE, 1, 1, 2 * ONE, &clock); // 3 net
    buy<MEME_A>(&mut v, &trade_cap, 2 * ONE, 1, 1, 0, &clock);
    assert_eq!(v.position_cost<MEME_A>(), 15 * ONE);
    give_back(v, owner_cap, trade_cap);
    finish(scenario, clock);
}

#[test]
fun buy_up_to_exactly_daily_spend_passes() {
    let (scenario, clock) = setup(100 * ONE);
    let (mut v, owner_cap, trade_cap) = take(&scenario);
    // Two launches x 15 = 30 = the daily cap.
    3u64.do!(|_| buy<MEME_A>(&mut v, &trade_cap, 5 * ONE, 1, 1, 0, &clock));
    3u64.do!(|_| buy<MEME_B>(&mut v, &trade_cap, 5 * ONE, 1, 1, 0, &clock));
    assert_eq!(v.spent_today(), 30 * ONE);
    give_back(v, owner_cap, trade_cap);
    finish(scenario, clock);
}

#[test, expected_failure(abort_code = vault::EExceedsDailySpend)]
fun buy_above_daily_spend_aborts() {
    let (mut scenario, clock) = setup(100 * ONE);
    let (mut v, owner_cap, trade_cap) = take(&scenario);
    v.set_limits(&owner_cap, vault::new_limits(5 * ONE, 15 * ONE, 30 * ONE, 5, true));
    3u64.do!(|_| buy<MEME_A>(&mut v, &trade_cap, 5 * ONE, 1, 1, 0, &clock));
    3u64.do!(|_| buy<MEME_B>(&mut v, &trade_cap, 5 * ONE, 1, 1, 0, &clock));
    buy<MEME_C>(&mut v, &trade_cap, 1, 1, 1, 0, &clock);
    scenario.next_tx(USER);
    abort 99
}

#[test]
fun daily_spend_resets_on_a_new_day() {
    let (scenario, mut clock) = setup(100 * ONE);
    let (mut v, owner_cap, trade_cap) = take(&scenario);
    3u64.do!(|_| buy<MEME_A>(&mut v, &trade_cap, 5 * ONE, 1, 1, 0, &clock));
    3u64.do!(|_| buy<MEME_B>(&mut v, &trade_cap, 5 * ONE, 1, 1, 0, &clock));
    // Free up per-launch room by selling everything of A, then roll the day.
    sell<MEME_A>(&mut v, &trade_cap, 3, 1, ONE);
    clock.increment_for_testing(DAY_MS);
    buy<MEME_A>(&mut v, &trade_cap, 5 * ONE, 1, 1, 0, &clock);
    assert_eq!(v.spent_today(), 5 * ONE);
    assert_eq!(v.day_index(), 11);
    give_back(v, owner_cap, trade_cap);
    finish(scenario, clock);
}

#[test]
fun max_open_positions_allows_topping_up_existing() {
    let (scenario, clock) = setup(100 * ONE);
    let (mut v, owner_cap, trade_cap) = take(&scenario);
    buy<MEME_A>(&mut v, &trade_cap, ONE, 1, 1, 0, &clock);
    buy<MEME_B>(&mut v, &trade_cap, ONE, 1, 1, 0, &clock);
    assert_eq!(v.open_positions(), 2);
    buy<MEME_A>(&mut v, &trade_cap, ONE, 1, 1, 0, &clock); // existing position: fine
    assert_eq!(v.open_positions(), 2);
    give_back(v, owner_cap, trade_cap);
    finish(scenario, clock);
}

#[test, expected_failure(abort_code = vault::ETooManyOpenPositions)]
fun opening_beyond_max_open_positions_aborts() {
    let (scenario, clock) = setup(100 * ONE);
    let (mut v, _owner_cap, trade_cap) = take(&scenario);
    buy<MEME_A>(&mut v, &trade_cap, ONE, 1, 1, 0, &clock);
    buy<MEME_B>(&mut v, &trade_cap, ONE, 1, 1, 0, &clock);
    buy<MEME_C>(&mut v, &trade_cap, ONE, 1, 1, 0, &clock);
    abort 99
}

#[test]
fun closing_a_position_frees_a_slot() {
    let (scenario, clock) = setup(100 * ONE);
    let (mut v, owner_cap, trade_cap) = take(&scenario);
    buy<MEME_A>(&mut v, &trade_cap, ONE, 1, 10, 0, &clock);
    buy<MEME_B>(&mut v, &trade_cap, ONE, 1, 10, 0, &clock);
    sell<MEME_A>(&mut v, &trade_cap, 10, 1, ONE);
    assert_eq!(v.open_positions(), 1);
    assert_eq!(v.position_cost<MEME_A>(), 0);
    buy<MEME_C>(&mut v, &trade_cap, ONE, 1, 10, 0, &clock);
    assert_eq!(v.open_positions(), 2);
    give_back(v, owner_cap, trade_cap);
    finish(scenario, clock);
}

#[test, expected_failure(abort_code = vault::EZeroMinOut)]
fun buy_with_zero_min_out_aborts() {
    let (scenario, clock) = setup(100 * ONE);
    let (mut v, _owner_cap, trade_cap) = take(&scenario);
    buy<MEME_A>(&mut v, &trade_cap, ONE, 0, 1, 0, &clock);
    abort 99
}

#[test, expected_failure(abort_code = vault::EZeroAmount)]
fun buy_with_zero_amount_aborts() {
    let (scenario, clock) = setup(100 * ONE);
    let (mut v, _owner_cap, trade_cap) = take(&scenario);
    buy<MEME_A>(&mut v, &trade_cap, 0, 1, 1, 0, &clock);
    abort 99
}

#[test, expected_failure(abort_code = vault::EOutputBelowMin)]
fun buy_returning_less_than_min_out_aborts() {
    let (scenario, clock) = setup(100 * ONE);
    let (mut v, _owner_cap, trade_cap) = take(&scenario);
    buy<MEME_A>(&mut v, &trade_cap, ONE, 1_000, 999, 0, &clock);
    abort 99
}

#[test, expected_failure(abort_code = vault::EInsufficientSui)]
fun buy_more_than_vault_holds_aborts() {
    let (scenario, clock) = setup(3 * ONE);
    let (mut v, _owner_cap, trade_cap) = take(&scenario);
    buy<MEME_A>(&mut v, &trade_cap, 4 * ONE, 1, 1, 0, &clock);
    abort 99
}

// === Sell ===

#[test]
fun sell_puts_sui_in_vault_and_reduces_cost_pro_rata() {
    let (scenario, clock) = setup(100 * ONE);
    let (mut v, owner_cap, trade_cap) = take(&scenario);
    buy<MEME_A>(&mut v, &trade_cap, 4 * ONE, 1, 1_000, 0, &clock);
    sell<MEME_A>(&mut v, &trade_cap, 250, 1, 2 * ONE);
    assert_eq!(v.sui_value(), 98 * ONE);
    assert_eq!(v.token_value<MEME_A>(), 750);
    assert_eq!(v.position_cost<MEME_A>(), 3 * ONE);
    // Sells never count as spend.
    assert_eq!(v.spent_today(), 4 * ONE);
    give_back(v, owner_cap, trade_cap);
    finish(scenario, clock);
}

#[test, expected_failure(abort_code = vault::EInsufficientTokens)]
fun sell_more_than_held_aborts() {
    let (scenario, clock) = setup(100 * ONE);
    let (mut v, _owner_cap, trade_cap) = take(&scenario);
    buy<MEME_A>(&mut v, &trade_cap, ONE, 1, 100, 0, &clock);
    sell<MEME_A>(&mut v, &trade_cap, 101, 1, 1);
    abort 99
}

#[test, expected_failure(abort_code = vault::EInsufficientTokens)]
fun sell_unheld_token_aborts() {
    let (scenario, _clock) = setup(100 * ONE);
    let (mut v, _owner_cap, trade_cap) = take(&scenario);
    sell<MEME_A>(&mut v, &trade_cap, 1, 1, 1);
    abort 99
}

#[test, expected_failure(abort_code = vault::EZeroMinOut)]
fun sell_with_zero_min_out_aborts() {
    let (scenario, clock) = setup(100 * ONE);
    let (mut v, _owner_cap, trade_cap) = take(&scenario);
    buy<MEME_A>(&mut v, &trade_cap, ONE, 1, 100, 0, &clock);
    sell<MEME_A>(&mut v, &trade_cap, 100, 0, 1);
    abort 99
}

#[test, expected_failure(abort_code = vault::EOutputBelowMin)]
fun sell_returning_less_than_min_out_aborts() {
    let (scenario, clock) = setup(100 * ONE);
    let (mut v, _owner_cap, trade_cap) = take(&scenario);
    buy<MEME_A>(&mut v, &trade_cap, ONE, 1, 100, 0, &clock);
    sell<MEME_A>(&mut v, &trade_cap, 100, ONE, ONE - 1);
    abort 99
}

// === Pause, revoke, foreign caps ===

#[test, expected_failure(abort_code = vault::EPaused)]
fun buy_while_paused_aborts() {
    let (scenario, clock) = setup(100 * ONE);
    let (mut v, owner_cap, trade_cap) = take(&scenario);
    v.pause(&owner_cap);
    buy<MEME_A>(&mut v, &trade_cap, ONE, 1, 1, 0, &clock);
    abort 99
}

#[test, expected_failure(abort_code = vault::EPaused)]
fun sell_while_paused_aborts() {
    let (scenario, clock) = setup(100 * ONE);
    let (mut v, owner_cap, trade_cap) = take(&scenario);
    buy<MEME_A>(&mut v, &trade_cap, ONE, 1, 10, 0, &clock);
    v.pause(&owner_cap);
    sell<MEME_A>(&mut v, &trade_cap, 10, 1, 1);
    abort 99
}

#[test]
fun resume_restores_trading() {
    let (scenario, clock) = setup(100 * ONE);
    let (mut v, owner_cap, trade_cap) = take(&scenario);
    v.pause(&owner_cap);
    assert!(v.is_paused());
    v.resume(&owner_cap);
    buy<MEME_A>(&mut v, &trade_cap, ONE, 1, 1, 0, &clock);
    give_back(v, owner_cap, trade_cap);
    finish(scenario, clock);
}

#[test, expected_failure(abort_code = vault::EAgentNotAuthorized)]
fun revoked_trade_cap_cannot_buy() {
    let (scenario, clock) = setup(100 * ONE);
    let (mut v, owner_cap, trade_cap) = take(&scenario);
    v.revoke_agent(&owner_cap);
    assert!(v.trade_cap_id().is_none());
    buy<MEME_A>(&mut v, &trade_cap, ONE, 1, 1, 0, &clock);
    abort 99
}

#[test, expected_failure(abort_code = vault::EAgentNotAuthorized)]
fun revoked_trade_cap_cannot_sell() {
    let (scenario, clock) = setup(100 * ONE);
    let (mut v, owner_cap, trade_cap) = take(&scenario);
    buy<MEME_A>(&mut v, &trade_cap, ONE, 1, 10, 0, &clock);
    v.revoke_agent(&owner_cap);
    sell<MEME_A>(&mut v, &trade_cap, 10, 1, 1);
    abort 99
}

#[test, expected_failure(abort_code = vault::EAgentNotAuthorized)]
fun replaced_trade_cap_stops_working() {
    let (mut scenario, clock) = setup(100 * ONE);
    let (mut v, owner_cap, old_cap) = take(&scenario);
    v.authorize_agent(&owner_cap, OPERATOR, scenario.ctx());
    ts::return_shared(v);
    scenario.next_tx(OPERATOR);
    let mut v = scenario.take_shared<AgentVault>();
    let new_id = v.trade_cap_id().destroy_some();
    assert!(new_id != object::id(&old_cap));
    let new_cap = scenario.take_from_address_by_id<TradeCap>(OPERATOR, new_id);
    // The new cap works...
    buy<MEME_A>(&mut v, &new_cap, ONE, 1, 1, 0, &clock);
    // ...and the old one aborts.
    buy<MEME_A>(&mut v, &old_cap, ONE, 1, 1, 0, &clock);
    destroy(owner_cap);
    abort 99
}

#[test, expected_failure(abort_code = vault::EWrongVault)]
fun trade_cap_of_another_vault_aborts() {
    let (mut scenario, clock) = setup(100 * ONE);
    // A second vault from someone else.
    scenario.next_tx(STRANGER);
    let other_owner = vault::create(
        default_limits(),
        FEE_CAP,
        TREASURY,
        FREE_DAYS,
        BOTH_VENUES,
        coin::mint_for_testing<SUI>(100 * ONE, scenario.ctx()),
        STRANGER,
        &clock,
        scenario.ctx(),
    );
    transfer::public_transfer(other_owner, STRANGER);
    scenario.next_tx(STRANGER);
    let foreign_cap = scenario.take_from_sender<TradeCap>();
    let foreign_vault_id = foreign_cap.trade_cap_vault_id();
    // Pick USER's vault (the one that is not the foreign cap's).
    let a = scenario.take_shared<AgentVault>();
    let b = scenario.take_shared<AgentVault>();
    let (mut mine, theirs) = if (object::id(&a) == foreign_vault_id) (b, a) else (a, b);
    ts::return_shared(theirs);
    buy<MEME_A>(&mut mine, &foreign_cap, ONE, 1, 1, 0, &clock);
    abort 99
}

#[test, expected_failure(abort_code = vault::EWrongVault)]
fun owner_cap_of_another_vault_cannot_withdraw() {
    let (mut scenario, clock) = setup(100 * ONE);
    scenario.next_tx(STRANGER);
    let other_owner = vault::create(
        default_limits(),
        FEE_CAP,
        TREASURY,
        FREE_DAYS,
        BOTH_VENUES,
        coin::mint_for_testing<SUI>(ONE, scenario.ctx()),
        STRANGER,
        &clock,
        scenario.ctx(),
    );
    let other_vault_id = other_owner.owner_cap_vault_id();
    scenario.next_tx(STRANGER);
    let a = scenario.take_shared<AgentVault>();
    let b = scenario.take_shared<AgentVault>();
    let (mut victim, theirs) = if (object::id(&a) == other_vault_id) (b, a) else (a, b);
    ts::return_shared(theirs);
    let stolen = victim.withdraw_sui(&other_owner, ONE, scenario.ctx());
    destroy(stolen);
    abort 99
}

// === The owner can never be blocked from withdrawing ===

#[test]
fun owner_withdraws_while_paused_and_after_revoke() {
    let (mut scenario, clock) = setup(100 * ONE);
    let (mut v, owner_cap, trade_cap) = take(&scenario);
    buy<MEME_A>(&mut v, &trade_cap, 5 * ONE, 1, 500, 0, &clock);
    v.pause(&owner_cap);
    let part: Coin<SUI> = v.withdraw_sui(&owner_cap, 10 * ONE, scenario.ctx());
    assert_eq!(part.value(), 10 * ONE);
    v.revoke_agent(&owner_cap);
    let rest = v.withdraw_all_sui(&owner_cap, scenario.ctx());
    assert_eq!(rest.value(), 85 * ONE);
    let tokens = v.withdraw_all_token<MEME_A>(&owner_cap, scenario.ctx());
    assert_eq!(tokens.value(), 500);
    assert_eq!(v.sui_value(), 0);
    assert_eq!(v.open_positions(), 0);
    destroy(part);
    destroy(rest);
    destroy(tokens);
    give_back(v, owner_cap, trade_cap);
    finish(scenario, clock);
}

#[test]
fun owner_withdraws_after_every_agent_limit_is_exhausted() {
    let (mut scenario, clock) = setup(100 * ONE);
    let (mut v, owner_cap, trade_cap) = take(&scenario);
    // Exhaust daily spend and open positions, then set limits to zero.
    3u64.do!(|_| buy<MEME_A>(&mut v, &trade_cap, 5 * ONE, 1, 1, 0, &clock));
    3u64.do!(|_| buy<MEME_B>(&mut v, &trade_cap, 5 * ONE, 1, 1, 0, &clock));
    v.set_limits(&owner_cap, vault::new_limits(0, 0, 0, 0, true));
    let all = v.withdraw_all_sui(&owner_cap, scenario.ctx());
    assert_eq!(all.value(), 70 * ONE);
    let a = v.withdraw_token<MEME_A>(&owner_cap, 1, scenario.ctx());
    assert_eq!(v.token_value<MEME_A>(), 2);
    assert_eq!(v.position_cost<MEME_A>(), 10 * ONE);
    destroy(all);
    destroy(a);
    give_back(v, owner_cap, trade_cap);
    finish(scenario, clock);
}

#[test]
fun withdrawn_coin_goes_to_the_owner_cap_holder() {
    let (mut scenario, clock) = setup(100 * ONE);
    let (mut v, owner_cap, trade_cap) = take(&scenario);
    let coin = v.withdraw_sui(&owner_cap, 7 * ONE, scenario.ctx());
    transfer::public_transfer(coin, USER);
    give_back(v, owner_cap, trade_cap);
    scenario.next_tx(USER);
    let received = scenario.take_from_sender<Coin<SUI>>();
    assert_eq!(received.value(), 7 * ONE);
    destroy(received);
    finish(scenario, clock);
}

#[test, expected_failure(abort_code = vault::EInsufficientSui)]
fun withdraw_more_than_balance_aborts() {
    let (mut scenario, _clock) = setup(10 * ONE);
    let (mut v, owner_cap, _trade_cap) = take(&scenario);
    let c = v.withdraw_sui(&owner_cap, 10 * ONE + 1, scenario.ctx());
    destroy(c);
    abort 99
}

// === Deposits ===

#[test]
fun deposits_add_to_balances() {
    let (mut scenario, clock) = setup(10 * ONE);
    let (mut v, owner_cap, trade_cap) = take(&scenario);
    v.deposit_sui(&owner_cap, coin::mint_for_testing<SUI>(5 * ONE, scenario.ctx()));
    v.deposit_token(&owner_cap, coin::mint_for_testing<MEME_A>(42, scenario.ctx()));
    v.deposit_token(&owner_cap, coin::mint_for_testing<MEME_A>(8, scenario.ctx()));
    assert_eq!(v.sui_value(), 15 * ONE);
    assert_eq!(v.token_value<MEME_A>(), 50);
    assert_eq!(v.open_positions(), 1);
    give_back(v, owner_cap, trade_cap);
    finish(scenario, clock);
}

#[test, expected_failure(abort_code = vault::ESuiIsNotAToken)]
fun depositing_sui_as_token_aborts() {
    let (mut scenario, _clock) = setup(10 * ONE);
    let (mut v, owner_cap, _trade_cap) = take(&scenario);
    v.deposit_token(&owner_cap, coin::mint_for_testing<SUI>(1, scenario.ctx()));
    abort 99
}

// === Accounting invariant: trades never move value out of the vault ===

#[test]
fun round_trip_keeps_all_value_in_the_vault() {
    let (scenario, clock) = setup(50 * ONE);
    let (mut v, owner_cap, trade_cap) = take(&scenario);
    buy<MEME_A>(&mut v, &trade_cap, 5 * ONE, 1, 1_000, 0, &clock);
    buy<MEME_B>(&mut v, &trade_cap, 5 * ONE, 1, 1_000, ONE, &clock);
    sell<MEME_A>(&mut v, &trade_cap, 1_000, 1, 6 * ONE);
    sell<MEME_B>(&mut v, &trade_cap, 1_000, 1, 3 * ONE);
    // 50 - 5 - 4 + 6 + 3 = 50: whatever the curve paid is in the vault, nothing left elsewhere.
    assert_eq!(v.sui_value(), 50 * ONE);
    assert_eq!(v.open_positions(), 0);
    give_back(v, owner_cap, trade_cap);
    finish(scenario, clock);
}

#[test]
fun destroy_trade_cap_works_for_the_holder() {
    let (mut scenario, clock) = setup(ONE);
    scenario.next_tx(OPERATOR);
    let trade_cap = scenario.take_from_sender<TradeCap>();
    vault::destroy_trade_cap(trade_cap);
    finish(scenario, clock);
}

// === Daily fee (SPEC 1b) ===

/// Moves the clock to `days` after creation (the vault is created on day 10).
fun at_day_after_creation(clock: &mut Clock, days: u64) { clock.set_for_testing((10 + days) * DAY_MS) }

fun treasury_received(scenario: &mut Scenario, expected: u64) {
    scenario.next_tx(TREASURY);
    let fee = scenario.take_from_sender<Coin<SUI>>();
    assert_eq!(fee.value(), expected);
    destroy(fee);
}

#[test]
fun create_records_fee_terms_and_free_period() {
    let (scenario, clock) = setup(100 * ONE);
    let (v, owner_cap, trade_cap) = take(&scenario);
    assert_eq!(v.daily_fee_cap(), FEE_CAP);
    assert_eq!(v.treasury(), TREASURY);
    // Created on day 10 with 7 free days: days 10..=16 are free, the first fee is due on day 17.
    assert_eq!(v.last_fee_day(), 16);
    give_back(v, owner_cap, trade_cap);
    finish(scenario, clock);
}

#[test, expected_failure(abort_code = vault::EFeeNotDue)]
fun fee_cannot_be_charged_in_the_free_period() {
    let (mut scenario, mut clock) = setup(100 * ONE);
    let (mut v, _owner_cap, trade_cap) = take(&scenario);
    at_day_after_creation(&mut clock, 6);
    v.charge_fee(&trade_cap, FEE_CAP, &clock, scenario.ctx());
    abort 99
}

#[test]
fun fee_after_the_free_period_goes_only_to_the_treasury() {
    let (mut scenario, mut clock) = setup(100 * ONE);
    let (mut v, owner_cap, trade_cap) = take(&scenario);
    at_day_after_creation(&mut clock, 7);
    v.charge_fee(&trade_cap, FEE_CAP, &clock, scenario.ctx());
    assert_eq!(v.sui_value(), 100 * ONE - FEE_CAP);
    assert_eq!(v.last_fee_day(), 17);
    give_back(v, owner_cap, trade_cap);
    treasury_received(&mut scenario, FEE_CAP);
    finish(scenario, clock);
}

#[test]
fun fee_with_no_free_period_is_due_on_creation_day() {
    let (mut scenario, clock) = setup_with_free_days(100 * ONE, 0);
    let (mut v, owner_cap, trade_cap) = take(&scenario);
    v.charge_fee(&trade_cap, FEE_CAP, &clock, scenario.ctx());
    give_back(v, owner_cap, trade_cap);
    treasury_received(&mut scenario, FEE_CAP);
    finish(scenario, clock);
}

#[test, expected_failure(abort_code = vault::EFeeNotDue)]
fun fee_cannot_be_charged_twice_in_a_day() {
    let (mut scenario, mut clock) = setup(100 * ONE);
    let (mut v, _owner_cap, trade_cap) = take(&scenario);
    at_day_after_creation(&mut clock, 7);
    v.charge_fee(&trade_cap, FEE_CAP / 2, &clock, scenario.ctx());
    clock.increment_for_testing(DAY_MS - 1); // still the same calendar day
    v.charge_fee(&trade_cap, FEE_CAP / 2, &clock, scenario.ctx());
    abort 99
}

#[test]
fun fee_can_be_charged_again_the_next_day_but_never_backdated() {
    let (mut scenario, mut clock) = setup(100 * ONE);
    let (mut v, owner_cap, trade_cap) = take(&scenario);
    at_day_after_creation(&mut clock, 7);
    v.charge_fee(&trade_cap, FEE_CAP, &clock, scenario.ctx());
    // Skipping three days still allows only one charge on the day it runs.
    at_day_after_creation(&mut clock, 11);
    v.charge_fee(&trade_cap, FEE_CAP, &clock, scenario.ctx());
    assert_eq!(v.sui_value(), 100 * ONE - 2 * FEE_CAP);
    assert_eq!(v.last_fee_day(), 21);
    give_back(v, owner_cap, trade_cap);
    finish(scenario, clock);
}

#[test]
fun fee_at_exactly_the_cap_passes() {
    let (mut scenario, mut clock) = setup(100 * ONE);
    let (mut v, owner_cap, trade_cap) = take(&scenario);
    at_day_after_creation(&mut clock, 7);
    v.charge_fee(&trade_cap, FEE_CAP, &clock, scenario.ctx());
    give_back(v, owner_cap, trade_cap);
    finish(scenario, clock);
}

#[test, expected_failure(abort_code = vault::EExceedsDailyFeeCap)]
fun fee_above_the_cap_aborts() {
    let (mut scenario, mut clock) = setup(100 * ONE);
    let (mut v, _owner_cap, trade_cap) = take(&scenario);
    at_day_after_creation(&mut clock, 7);
    v.charge_fee(&trade_cap, FEE_CAP + 1, &clock, scenario.ctx());
    abort 99
}

#[test, expected_failure(abort_code = vault::EZeroAmount)]
fun zero_fee_aborts() {
    let (mut scenario, mut clock) = setup(100 * ONE);
    let (mut v, _owner_cap, trade_cap) = take(&scenario);
    at_day_after_creation(&mut clock, 7);
    v.charge_fee(&trade_cap, 0, &clock, scenario.ctx());
    abort 99
}

#[test, expected_failure(abort_code = vault::EPaused)]
fun paused_vault_pays_no_fee() {
    let (mut scenario, mut clock) = setup(100 * ONE);
    let (mut v, owner_cap, trade_cap) = take(&scenario);
    v.pause(&owner_cap);
    at_day_after_creation(&mut clock, 7);
    v.charge_fee(&trade_cap, FEE_CAP, &clock, scenario.ctx());
    abort 99
}

#[test, expected_failure(abort_code = vault::EAgentNotAuthorized)]
fun revoked_vault_pays_no_fee() {
    let (mut scenario, mut clock) = setup(100 * ONE);
    let (mut v, owner_cap, trade_cap) = take(&scenario);
    v.revoke_agent(&owner_cap);
    at_day_after_creation(&mut clock, 7);
    v.charge_fee(&trade_cap, FEE_CAP, &clock, scenario.ctx());
    abort 99
}

#[test, expected_failure(abort_code = vault::EInsufficientSui)]
fun fee_never_sells_tokens_to_pay() {
    let (mut scenario, mut clock) = setup(5 * ONE);
    let (mut v, _owner_cap, trade_cap) = take(&scenario);
    // All SUI is in a position; the fee aborts instead of touching tokens.
    buy<MEME_A>(&mut v, &trade_cap, 5 * ONE, 1, 1_000, 0, &clock);
    at_day_after_creation(&mut clock, 7);
    v.charge_fee(&trade_cap, FEE_CAP, &clock, scenario.ctx());
    abort 99
}

#[test]
fun owner_changes_fee_terms_and_the_new_treasury_is_paid() {
    let (mut scenario, mut clock) = setup(100 * ONE);
    let (mut v, owner_cap, trade_cap) = take(&scenario);
    v.set_fee_terms(&owner_cap, FEE_CAP / 4, STRANGER);
    assert_eq!(v.daily_fee_cap(), FEE_CAP / 4);
    at_day_after_creation(&mut clock, 7);
    v.charge_fee(&trade_cap, FEE_CAP / 4, &clock, scenario.ctx());
    give_back(v, owner_cap, trade_cap);
    scenario.next_tx(STRANGER);
    let fee = scenario.take_from_sender<Coin<SUI>>();
    assert_eq!(fee.value(), FEE_CAP / 4);
    destroy(fee);
    finish(scenario, clock);
}

#[test, expected_failure(abort_code = vault::EExceedsDailyFeeCap)]
fun zero_fee_cap_means_no_fee_can_ever_be_charged() {
    let (mut scenario, mut clock) = setup(100 * ONE);
    let (mut v, owner_cap, trade_cap) = take(&scenario);
    v.set_fee_terms(&owner_cap, 0, TREASURY);
    at_day_after_creation(&mut clock, 7);
    v.charge_fee(&trade_cap, 1, &clock, scenario.ctx());
    abort 99
}

#[test, expected_failure(abort_code = vault::EWrongVault)]
fun fee_terms_need_the_vaults_own_owner_cap() {
    let (mut scenario, clock) = setup(100 * ONE);
    scenario.next_tx(STRANGER);
    let other_owner = vault::create(
        default_limits(),
        FEE_CAP,
        STRANGER,
        FREE_DAYS,
        BOTH_VENUES,
        coin::mint_for_testing<SUI>(ONE, scenario.ctx()),
        STRANGER,
        &clock,
        scenario.ctx(),
    );
    let other_vault_id = other_owner.owner_cap_vault_id();
    scenario.next_tx(STRANGER);
    let a = scenario.take_shared<AgentVault>();
    let b = scenario.take_shared<AgentVault>();
    let (mut victim, theirs) = if (object::id(&a) == other_vault_id) (b, a) else (a, b);
    ts::return_shared(theirs);
    victim.set_fee_terms(&other_owner, 100 * ONE, STRANGER);
    abort 99
}

#[test]
fun owner_withdraws_everything_regardless_of_fees() {
    let (mut scenario, mut clock) = setup(100 * ONE);
    let (mut v, owner_cap, trade_cap) = take(&scenario);
    at_day_after_creation(&mut clock, 7);
    v.charge_fee(&trade_cap, FEE_CAP, &clock, scenario.ctx());
    let all = v.withdraw_all_sui(&owner_cap, scenario.ctx());
    assert_eq!(all.value(), 100 * ONE - FEE_CAP);
    destroy(all);
    give_back(v, owner_cap, trade_cap);
    finish(scenario, clock);
}

// === Agent self-pause (SPEC 1b) ===

#[test]
fun agent_pauses_itself_and_only_the_owner_resumes() {
    let (scenario, clock) = setup(100 * ONE);
    let (mut v, owner_cap, trade_cap) = take(&scenario);
    v.pause_by_agent(&trade_cap, 1);
    assert!(v.is_paused());
    v.resume(&owner_cap);
    buy<MEME_A>(&mut v, &trade_cap, ONE, 1, 1, 0, &clock);
    give_back(v, owner_cap, trade_cap);
    finish(scenario, clock);
}

#[test, expected_failure(abort_code = vault::EPaused)]
fun agent_pause_blocks_its_own_trades() {
    let (scenario, clock) = setup(100 * ONE);
    let (mut v, _owner_cap, trade_cap) = take(&scenario);
    v.pause_by_agent(&trade_cap, 2);
    buy<MEME_A>(&mut v, &trade_cap, ONE, 1, 1, 0, &clock);
    abort 99
}

#[test, expected_failure(abort_code = vault::EInvalidPauseReason)]
fun agent_cannot_claim_to_be_the_owner() {
    let (scenario, _clock) = setup(100 * ONE);
    let (mut v, _owner_cap, trade_cap) = take(&scenario);
    v.pause_by_agent(&trade_cap, 0);
    abort 99
}

#[test, expected_failure(abort_code = vault::EAgentNotAuthorized)]
fun revoked_agent_cannot_pause() {
    let (scenario, _clock) = setup(100 * ONE);
    let (mut v, owner_cap, trade_cap) = take(&scenario);
    v.revoke_agent(&owner_cap);
    v.pause_by_agent(&trade_cap, 1);
    abort 99
}

#[test]
fun owner_withdraws_after_agent_pause() {
    let (mut scenario, clock) = setup(100 * ONE);
    let (mut v, owner_cap, trade_cap) = take(&scenario);
    v.pause_by_agent(&trade_cap, 1);
    let all = v.withdraw_all_sui(&owner_cap, scenario.ctx());
    assert_eq!(all.value(), 100 * ONE);
    destroy(all);
    give_back(v, owner_cap, trade_cap);
    finish(scenario, clock);
}

// === Venues (owner chooses where the agent may buy) ===

#[test]
fun owner_limits_the_agent_to_one_venue() {
    let (scenario, clock) = setup(100 * ONE);
    let (mut v, owner_cap, trade_cap) = take(&scenario);
    assert_eq!(v.venues(), BOTH_VENUES);
    v.set_venues(&owner_cap, vault::venue_suipump());
    assert_eq!(v.venues(), 2);
    // A SuiPump buy is still allowed.
    let (quote, ticket) = v.begin_buy<MEME_A>(&trade_cap, vault::venue_suipump(), ONE, 1, &clock);
    balance::destroy_for_testing(quote);
    v.finish_buy<MEME_A>(ticket, balance::create_for_testing<MEME_A>(10), balance::zero());
    give_back(v, owner_cap, trade_cap);
    finish(scenario, clock);
}

#[test, expected_failure(abort_code = vault::EVenueNotAllowed)]
fun agent_cannot_buy_on_a_venue_the_owner_disabled() {
    let (scenario, clock) = setup(100 * ONE);
    let (mut v, owner_cap, trade_cap) = take(&scenario);
    v.set_venues(&owner_cap, vault::venue_suipump());
    buy<MEME_A>(&mut v, &trade_cap, ONE, 1, 1, 0, &clock); // Blast
    abort 99
}

#[test]
fun selling_still_works_after_a_venue_is_disabled() {
    let (scenario, clock) = setup(100 * ONE);
    let (mut v, owner_cap, trade_cap) = take(&scenario);
    buy<MEME_A>(&mut v, &trade_cap, ONE, 1, 10, 0, &clock);
    v.set_venues(&owner_cap, vault::venue_suipump());
    sell<MEME_A>(&mut v, &trade_cap, 10, 1, ONE);
    assert_eq!(v.open_positions(), 0);
    give_back(v, owner_cap, trade_cap);
    finish(scenario, clock);
}

#[test, expected_failure(abort_code = vault::EInvalidVenues)]
fun empty_venue_set_is_rejected() {
    let (scenario, _clock) = setup(100 * ONE);
    let (mut v, owner_cap, _trade_cap) = take(&scenario);
    v.set_venues(&owner_cap, 0);
    abort 99
}

#[test, expected_failure(abort_code = vault::EInvalidVenues)]
fun unknown_venue_bit_is_rejected() {
    let (scenario, _clock) = setup(100 * ONE);
    let (mut v, owner_cap, _trade_cap) = take(&scenario);
    v.set_venues(&owner_cap, 4);
    abort 99
}
