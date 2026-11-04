/// Interface stub. See Move.toml.
module blast_fun_timelock::blast_fun_timelock;

use sui::clock::Clock;

public struct Timelocked<T: copy + drop + store> has copy, drop, store {
    value: T,
    scheduled: T,
    scheduled_at_ms: u64,
    delay_ms: u64,
}

public fun new<T: copy + drop + store>(_value: T, _delay_ms: u64): Timelocked<T> { abort 0 }

public fun schedule<T: copy + drop + store>(_self: &mut Timelocked<T>, _value: T, _clock: &Clock) { abort 0 }

public fun scheduled<T: copy + drop + store>(_self: &Timelocked<T>): T { abort 0 }

public fun scheduled_at_ms<T: copy + drop + store>(_self: &Timelocked<T>): u64 { abort 0 }

public fun value<T: copy + drop + store>(_self: &Timelocked<T>, _clock: &Clock): T { abort 0 }

#[test_only]
public fun new_scheduled_for_testing<T: copy + drop + store>(
    _before: T,
    _after: T,
    _at_ms: u64,
    _delay_ms: u64,
): Timelocked<T> { abort 0 }
