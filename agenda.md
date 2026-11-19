# Agenda

## int8: transpiler vs SAP (investigated 2026-11-19)

Probe: report `ZTRANSP_INT8` in `$TMP` on A4H (ABAP 816), 74 probes, run on SAP via
ABAP Unit (`cl_abap_unit_assert=>fail( quit = if_aunit_constants=>quit-no )`, one alert
per output line, because VSP RunReport timed out for every report) and locally through
the transpiler at main + 2 ASSIGN commits (62714bd8). 39 of 74 match.

### Findings

| # | Area | SAP 816 | Transpiler (main) | Tracked by |
|---|------|---------|-------------------|------------|
| F1 | int8 arithmetic overflow: `+ - * DIV /`, `ipow`, `abs( min )`, `0 - min`, `ADD`, `SUBTRACT` | `CX_SY_ARITHMETIC_OVERFLOW`, target keeps its old value | no exception, out-of-range BigInt stored | issue #2042 (open, no PR) |
| F2 | conversion overflow into int8 from string, `f`, `p` | `CX_SY_CONVERSION_OVERFLOW`; `f`/`p` source: target kept; string source: target becomes `1` (!) | no exception, out-of-range value stored | none |
| F3 | conversion overflow int8 -> i (`i = int8_max`) | `CX_SY_CONVERSION_OVERFLOW`, target becomes `-1` (!) | no exception, `9223372036854776000` | likely PR #2014 / #1955 (i range check), not verified |
| F4 | int8 -> string / c sign and padding | `3-`, `3 ` (trailing blank for positive), `9223372036854775808-`; c10 right-aligned `        3-` | `-3`, `3`, `-9223372036854775808`, not right-aligned | issue #1939 (open, no PR) |
| F5 | int8 <-> x / xstring byte layout | big-endian, right-aligned, two's complement, last 8 bytes signed (e.g. `x4 = 72623859790382856` -> `05060708`) | keeps leading bytes, pads on the wrong side, unsigned long-hex decode; `xs = i(-2)` -> `-2` | issues #1963, #1673; PR #1964 fixes all of them (verified), but conflicts with #2041 in `xstring.ts` and larshp asked for ABAP-based unit tests |
| F6 | empty xstring -> int8 | `0` | JS crash `Cannot convert 0x to a BigInt` | fixed by PR #1964 (verified) |
| F7 | int8 -> n (numc) | `0000000003` | JS crash `value.get is not a function` (`Numc.set`) | none |
| F8 | `nmax( val1 = int8_max val2 = 1 )` | `9223372036854775807` | JS crash `int8 value too large for table expression index` (`_extremum` -> `_parse`) | none |
| F9 | int8 compared with `x LENGTH 8` (`IF int8 > x8`) | `gt` | JS crash `runtime_todo, gt hex1` (`compare/gt.ts`) | none |
| F10 | `DATA/CONSTANTS ... TYPE int8 VALUE <n>` above 2^53 | exact | precision lost: transpiler emits `.set(9223372036854775807)` as a JS number -> `...808` | none |

Not pursued: `int8_max -> f -> p` gives `...808.00` locally vs `...800.00` on SAP (f->p
rounding, not int8-specific); `WRITE TO` sign and thousands separators (general WRITE
formatting, user-settings dependent).

Already matching SAP: DIV/MOD with negative operands, `/` rounding, `p`/`f`/`decfloat34`/`d`
-> int8, `i op i` computed in int8, DESCRIBE FIELD, int8 -> xstring minimal bytes (#2041),
`p`/`decfloat34` targets of int8 arithmetic.

SAP quirks to re-check before encoding them in a fix: after a conversion overflow the
target is `1` (string source) and `-1` (int8 -> i), whereas `f`/`p` sources keep the old
value. This contradicts the "a failed conversion clears its target" rule of #1986.

### Proposed split

Small, independent PRs, each with an ABAP-level test (`test/types/integer8.ts`) whose
expectation was checked on SAP.

1. **F7 int8 -> numc crash** - new issue + small PR in `types/numc.ts`.
2. **F8 nmax/nmin with large int8** - new issue + small PR in `builtin/_extremum.ts`.
3. **F9 int8 vs hex comparison crash** - new issue + small PR in `compare/gt.ts` (check
   `eq`/`lt` paths at the same time).
4. **F10 int8 VALUE precision** - new issue + transpiler-side PR (emit the literal as a
   string or BigInt for int8 `VALUE`, as plain assignment already does).
5. **F5 + F6 byte fields** - do not duplicate: comment on PR #1964 with the SAP 816
   results, offer to resolve the `xstring.ts` conflict with #2041 and add the ABAP-based
   tests larshp asked for. Fall back to a follow-up PR only if #1964 stays stale.
6. **F4 sign placement (#1939)** - one PR: int8 -> string/c uses the same trailing-sign
   rule as `i`, including the trailing blank for positives, right alignment in c, and the
   int8 minimum.
7. **F1 + F2 overflow (#2042 + new issue for F2)** - one PR, after the direction of
   PR #2014 (i range check) is settled, mirroring its design: `Integer8.set()` raises
   `CX_SY_CONVERSION_OVERFLOW` for out-of-range sources, arithmetic results out of range
   raise `CX_SY_ARITHMETIC_OVERFLOW`, target keeps its value. Largest change and touches
   the hot path, so it needs the performance run. F3 should come with #2014; verify after.

Order: 1-4 (quick, low risk), 5 (coordination), 6, then 7.

### Status (2026-11-19)

Verified on A4H with `ZTRANSP_INT8_PR` (cases 1-7) and `ZTRANSP_NUMC` (cases 1-2), run via
`SAP(action="rfc", op "run")`.

| Finding | Issue | PR | Branch |
|---|---|---|---|
| F7 int8 -> n crash | #2142 | #2143 | `int8-to-numc` |
| new: text -> n loses digits above 2^53, so n -> int8 inexact | #2144 | #2145 | `numc-to-int8` |
| F8 nmax/nmin with large int8 | #2146 | #2147 | `int8-nmax-nmin` |
| F9 int8 vs x (crash + wrong `=`/`<`/`>`) | #2148 | #2149 | `int8-compare-hex` |
| F10 VALUE literal above 2^53 (int8 and p) | #2150 | #2151 | `int8-value-literal` |
| new: i/p/f/decfloat34 -> n keeps sign, truncates (SAP: abs, round half away from zero) | not filed | local commit 2a68dbdb | `numeric-to-numc` (not pushed) |

Next: 5 (comment on #1964), 6 (#1939), 7 (#2042).
