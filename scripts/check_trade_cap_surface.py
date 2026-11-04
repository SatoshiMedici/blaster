#!/usr/bin/env python3
"""Custody guard for blast_agent_vault (SPEC 1 core principle, SPEC 1b fee rule).

Fails CI unless all of these hold for every externally callable function (public or
entry) that takes a TradeCap:

1. It returns nothing that holds value or authority (Coin, Balance, Bag, Table, caps, tickets).
2. It transfers, shares or freezes nothing, directly or through a helper, with one
   exception: `charge_fee` may pay `vault.sui` to `vault.treasury`, in exactly the reviewed
   form in ALLOWED_FEE_LINES.

Across the whole module (helpers included), objects may only be transferred, shared or
frozen by `create`, by owner functions that take `&OwnerCap`, or by the fee lines above.

It also checks that TradeCap keeps only `key, store` and its two fields, and that the
begin/finish trade halves stay `public(package)`.

Any change to the allowed fee transfer must update ALLOWED_FEE_LINES and be reviewed as a
custody change (docs/SECURITY.md).

Usage: check_trade_cap_surface.py path/to/vault.move
"""

import re
import sys

VALUE_TYPES = r"\b(Coin|Balance|Bag|Table|AgentVault|OwnerCap|TradeCap|BuyTicket|SellTicket)\b"
OUTFLOW = re.compile(r"\btransfer::\w+|\bshare_object\b|\bfreeze_object\b|\bpublic_share_object\b")
ALLOWED_FEE_LINES = [
    "let treasury = vault.treasury;",
    "transfer::public_transfer(coin::from_balance(vault.sui.split(amount), ctx), treasury);",
]


def function_body(src: str, open_brace: int) -> str:
    depth = 0
    for i in range(open_brace, len(src)):
        if src[i] == "{":
            depth += 1
        elif src[i] == "}":
            depth -= 1
            if depth == 0:
                return src[open_brace + 1 : i]
    raise ValueError("unbalanced braces")


def main(path: str) -> int:
    src = re.sub(r"//[^\n]*", "", open(path, encoding="utf8").read())
    errors: list[str] = []

    fn_re = re.compile(
        r"\b(public(?!\s*\(package\))|entry|public\s+entry)\s+fun\s+(\w+)\s*(<[^>]*>)?\s*\((.*?)\)\s*(:\s*([^{]+))?\{",
        re.S,
    )
    checked: list[str] = []
    for m in fn_re.finditer(src):
        name, params, ret = m.group(2), m.group(4), (m.group(6) or "").strip()
        if not re.search(r"\bTradeCap\b", params):
            continue
        checked.append(name)
        if re.search(VALUE_TYPES, ret):
            errors.append(f"{name}: takes a TradeCap and returns `{ret}`")

        body = function_body(src, m.end() - 1)
        if name == "charge_fee":
            lines = [line.strip() for line in body.splitlines()]
            for allowed in ALLOWED_FEE_LINES:
                if allowed not in lines:
                    errors.append(f"charge_fee: expected `{allowed}`")

    any_fn = re.compile(r"\bfun\s+(\w+)\s*(<[^>]*>)?\s*\((.*?)\)\s*(:\s*([^{]+))?\{", re.S)
    for m in any_fn.finditer(src):
        name, params = m.group(1), m.group(3)
        if name == "create" or re.search(r"&OwnerCap\b", params):
            continue
        body = function_body(src, m.end() - 1)
        for line in body.splitlines():
            line = line.strip()
            if OUTFLOW.search(line) and not (name == "charge_fee" and line in ALLOWED_FEE_LINES):
                errors.append(f"{name}: only owner functions may move objects out: `{line}`")

    cap = re.search(r"public struct TradeCap has ([^{]+)\{([^}]*)\}", src)
    if not cap:
        errors.append("TradeCap struct not found")
    else:
        abilities = {a.strip() for a in cap.group(1).split(",")}
        if abilities != {"key", "store"}:
            errors.append(f"TradeCap abilities must be key, store; found {sorted(abilities)}")
        fields = sorted(f.strip() for f in cap.group(2).split(",") if f.strip())
        if fields != ["id: UID", "vault_id: ID"]:
            errors.append(f"TradeCap fields changed: {fields}")

    for internal in ("begin_buy", "finish_buy", "begin_sell", "finish_sell"):
        if not re.search(rf"public\(package\)\s+fun\s+{internal}\b", src):
            errors.append(f"{internal} must stay public(package)")

    for expected in ("buy", "sell", "charge_fee", "pause_by_agent", "destroy_trade_cap"):
        if expected not in checked:
            errors.append(f"expected `{expected}` to take a TradeCap")

    for e in errors:
        print(f"custody check: {e}", file=sys.stderr)
    if not errors:
        print(
            f"custody check: OK ({len(checked)} TradeCap functions: {', '.join(checked)}; "
            "only charge_fee pays out, to vault.treasury)"
        )
    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1]))
