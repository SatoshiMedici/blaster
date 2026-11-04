#!/usr/bin/env python3
"""Custody guard for blast_agent_vault (SPEC 1, core principle).

Fails if any externally callable function (public or entry) that takes a TradeCap
returns anything holding value or authority (Coin, Balance, Bag, Table, caps,
tickets). The agent can only move value between vault.sui and vault.tokens; it must never get
value out. Also fails if TradeCap gains the `drop`/`copy` abilities or a non-vault field.

Usage: check_trade_cap_surface.py path/to/vault.move
"""

import re
import sys


def main(path: str) -> int:
    src = open(path, encoding="utf8").read()
    # Strip comments.
    src = re.sub(r"//[^\n]*", "", src)
    errors: list[str] = []

    fn_re = re.compile(
        r"\b(public(?!\s*\(package\))|entry|public\s+entry)\s+fun\s+(\w+)\s*(<[^>]*>)?\s*\((.*?)\)\s*(:\s*([^{]+))?\{",
        re.S,
    )
    checked = 0
    for m in fn_re.finditer(src):
        name, params, ret = m.group(2), m.group(4), (m.group(6) or "").strip()
        if not re.search(r"\bTradeCap\b", params):
            continue
        checked += 1
        if name == "destroy_trade_cap":
            if ret:
                errors.append(f"{name}: must not return anything")
            continue
        if re.search(r"\b(Coin|Balance|Bag|Table|AgentVault|OwnerCap|TradeCap|BuyTicket|SellTicket)\b", ret):
            errors.append(f"{name}: takes a TradeCap and returns `{ret}`")

    cap = re.search(r"public struct TradeCap has ([^{]+)\{([^}]*)\}", src)
    if not cap:
        errors.append("TradeCap struct not found")
    else:
        abilities = {a.strip() for a in cap.group(1).split(",")}
        if abilities & {"copy", "drop"}:
            errors.append(f"TradeCap must not have copy/drop, has {sorted(abilities)}")
        fields = [f.strip() for f in cap.group(2).split(",") if f.strip()]
        if sorted(fields) != ["id: UID", "vault_id: ID"]:
            errors.append(f"TradeCap fields changed: {fields}")

    for internal in ("begin_buy", "finish_buy", "begin_sell", "finish_sell"):
        if not re.search(rf"public\(package\)\s+fun\s+{internal}\b", src):
            errors.append(f"{internal} must stay public(package)")

    if checked < 3:
        errors.append(f"expected buy, sell and destroy_trade_cap to take a TradeCap; found {checked}")

    for e in errors:
        print(f"custody check: {e}", file=sys.stderr)
    if not errors:
        print(f"custody check: OK ({checked} TradeCap functions, none return value or authority)")
    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1]))
