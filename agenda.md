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

## Merge watch

Expectations of every PR below were verified on A4H with `ZTRANSP_INT8_PR` (cases 1-7)
and `ZTRANSP_NUMC` (cases 1-2), both in `$TMP`, run via `SAP(action="rfc", op "run")`.

Check states with:

```sh
for n in 2143 2145 2147 2149 2151 2141 2152 2153 1964 2014; do gh pr view $n --repo abaplint/transpiler --json number,state,mergeable,reviewDecision --jq '"#\(.number) \(.state) \(.mergeable) \(.reviewDecision)"'; done
```

### Our PRs

| Finding | Issue | PR | Branch | State 2026-11-19 | Notes |
|---|---|---|---|---|---|
| F7 int8 -> n crash | #2142 | #2143 | `int8-to-numc` | open, mergeable, CI green (1 running) | |
| new: text -> n loses digits above 2^53, so n -> int8 inexact | #2144 | #2145 | `numc-to-int8` | open, mergeable, CI green (1 running) | also touches `numc.ts`, like #2143, different lines |
| F8 nmax/nmin with large int8 | #2146 | #2147 | `int8-nmax-nmin` | open, mergeable, CI green (1 running) | |
| F9 int8 vs x (crash + wrong `=`/`<`/`>`) | #2148 | #2149 | `int8-compare-hex` | open, mergeable, CI green (1 running) | |
| F10 VALUE literal above 2^53 (int8 and p) | #2150 | #2151 | `int8-value-literal` | open, mergeable, CI green (1 running) | transpiler side, changes generated code for large literals only |
| ASSIGN COMPONENT type check (#417) | - | #2141 | `fix-assign-component-type` | open, mergeable | not int8, listed to keep track |

### What to watch while they merge

- **Test-file conflicts:** #2143, #2145, #2149 and #2151 all append a test at the end of
  `test/types/integer8.ts`. After the first merges, the others conflict there: rebase on
  `upstream/main` and keep both tests.
- **`numc.ts`:** #2143 (non-character path) and #2145 (text path) edit `Numc.set`
  in different branches of the same function; git may still flag a conflict. Also the
  local `numeric-to-numc` commit edits the same function - rebase it after both merge.
- **Combined effect:** `DATA n20 TYPE n LENGTH 20 VALUE 12345678901234567891` is exact
  only once both #2145 (text -> n) and #2151 (VALUE emitted as text) are merged.
- **Review feedback:** larshp asked #1964 for ABAP-based unit tests; ours are ABAP
  snippets in the integration tests, which should satisfy the same expectation.
- **After each merge:** pull `upstream/main`, rerun the int8 probe locally (scratchpad
  `run.js` against `ZTRANSP_INT8` source) and tick the finding off here.

### Related PRs of others

| PR | Topic | State 2026-11-19 | Why it matters |
|---|---|---|---|
| #1964 (oisee) | int8 <-> x/xstring byte layout, fixes #1963, #1673, F6 | open, CONFLICTING (with #2041 in `xstring.ts`), changes requested | plan item 5: comment with SAP 816 results, offer rebase + ABAP tests |
| #2014 (oblomov-dev) | `i` range check, overflow raises | open | covers F3 (`i = int8` overflow); plan item 7 should mirror its design |
| #1955 | `i` overflow raises | open | overlaps #2014 |

## Not filed / to decide

1. **Numbers -> n** (`i`, `p`, `f`, `decfloat34`): transpiler keeps the minus sign and
   truncates; SAP stores the absolute value rounded half away from zero (`-3.7` ->
   `0000000004`). Fixed and tested in local commit `2a68dbdb` on branch `numeric-to-numc`
   (not pushed). Issue text ready in scratchpad `issue_b.md` (copy below if lost). Opening it
   was blocked by the permission check - decide whether to file.
2. **int8 vs xstring comparison** - not covered by #2149, SAP behaviour not checked.
3. **x longer than 8 bytes vs int8** - depends on #1963 / #1964.
4. **8-byte hex through `parse( )`** - `Math.pow` two's complement loses sign and
   precision for `x LENGTH 8` anywhere a number is used, e.g. `x8` vs `i`, `p`, `f`.
   Not checked on SAP.
5. **Overflow tests (#2042):** the test environment has no `CX_SY_*` classes, so
   `CATCH cx_sy_conversion_overflow` fails the syntax check in `integer8.ts`; the overflow
   PR must declare the classes in the test or check the error differently.
6. **Not int8, noted earlier:** `int8_max -> f -> p` gives `...808.00` vs SAP
   `...800.00` (f -> p rounding); `WRITE TO` sign and thousands separators.

<details><summary>issue_b.md (numbers -> n)</summary>

Title: i, p, f and decfloat34 to n: minus sign kept and decimals truncated

| source | real system (ABAP 816) | transpiler |
|---|---|---|
| `i` `-3` | `0000000003` | `00000000-3` |
| `p` `-3.70` | `0000000004` | `00000000-3` |
| `p` `3.50` | `0000000004` | `0000000003` |
| `p` `-3.50` | `0000000004` | `00000000-3` |
| `p` `3.49` | `0000000003` | `0000000003` |
| `f` `-3.7` | `0000000004` | `00000000-3` |
| `f` `3.5` | `0000000004` | `0000000003` |
| `decfloat34` `-3.7` | `0000000004` | `00000000-3` |
| `decfloat34` `3.5` | `0000000004` | `0000000003` |

Cause: `Numc.set` uses `Math.trunc( )` and keeps the sign; `p` arrives as a double through
`get()`, `decfloat34` as text with a decimal comma.
</details>

## Goal: close all our issues

All issues authored by arcanist123 on abaplint/transpiler (36 total, checked 2026-11-19).
Re-check with:

```sh
gh issue list --repo abaplint/transpiler --author arcanist123 --state open --json number,title --jq '.[]|"#\(.number) \(.title)"'
```

### Open, PR pending - closes on merge

| Issue | PR |
|---|---|
| #417 assign does not respect type of target field symbol | #2141 |
| #2142 int8 to n: runtime error | #2143 |
| #2144 text to n loses digits above 2^53 | #2145 |
| #2146 nmax/nmin with int8 above 2^53 | #2147 |
| #2148 int8 compared with x | #2149 |
| #2150 VALUE literal above 2^53 | #2151 |

### Open, no PR yet - need a fix

| Issue | Opened | Topic | First step |
|---|---|---|---|
| #2136 | 2026-11-19 | ASSIGN with offset/length gives a copy, writes do not reach the data object | follow-up announced in #2137; also unblocks ASSIGN INCREMENT on partial components |
| #2139 | 2026-11-19 | AS TEXT: SORT ignores it, FOR GROUPS / LOOP AT GROUP BY throw a todo | GROUP BY landed in #2138 - re-check what is left |
| #2140 | 2026-11-19 | SORT of a table WITH EMPTY KEY sorts rows; SAP keeps order | |
| #419 | 2021-05-23 | structure move does not transfer all components | still broken, see re-test below |
| #420 | 2021-05-23 | SHIFT in byte mode should raise for a dynamic type | still broken, see re-test below |
| #427 | 2021-05-26 | runtime assignment should throw an error instead of breaking | still broken, see re-test below |

#### 2021 issues re-tested 2026-11-19

Transpiler: upstream/main `73f2dcfe`. SAP: A4H 816, report `ZTRANSP_2021` in `$TMP`
(cases 1-5), run via `SAP(action="rfc", op "run")`. All three still reproduce, none
can be closed. No PR mentions them, and the runtime raises none of the SAP error names below yet.

| Issue | Case | SAP 816 | Transpiler (main) |
|---|---|---|---|
| #419 | 1: `MOVE` c10 struct `'asdasd'` to struct of 2 x c5 | `a = 'asdas'`, `b = 'd'` (flat char structs moved as one c field) | `a = 'asdas'`, `b` blank: component-wise move, truncated |
| #420 | 2: `SHIFT <any -> string> BY 1 PLACES LEFT IN BYTE MODE` | dump `OBJECTS_NOT_BYTELIKE` | no error, `lv_temp = 'c'` |
| #420 | static `SHIFT lv_string ... IN BYTE MODE` | syntax error | `check_syntax, Target not hex like` (already fine, abaplint) |
| #427 | 3: `MOVE i TO <any -> struct>` | dump `UC_OBJECTS_NOT_CONVERTIBLE` | JS `TypeError this.value[key].getLength is not a function` |
| #427 | 4: `MOVE string TO <any -> struct>` | dump `UC_OBJECTS_NOT_CONVERTIBLE` | same JS TypeError |
| #427 | 5: `WRITE <any -> ref to class>` | dump `OBJECTS_NOT_CHARCONV` | JS `TypeError Cannot read properties of undefined (reading 'toString')` |

Fix notes:
- **#419** is the smallest and most visible: when both structures are flat and
  character-like but not compatible, move them as one char field (concatenate the source,
  cut it into the target components). Check what SAP does with non-char components
  (Unicode fragment views) before widening the rule.
- **#427** - three different runtime errors; one PR in the structure/ref `set()` paths
  plus `WRITE`. Comment on the issue with the dump names first.
- **#420** - raise `OBJECTS_NOT_BYTELIKE` in `SHIFT ... IN BYTE MODE` when the target is
  not `x`/`xstring`. (Today it treats the text as hex, so 1 byte = 2 characters and
  `'abc'` becomes `'c'`.)

#### Conflict map (checked 2026-11-19 against the files of all 45 open PRs)

| Fix | Files | Conflict |
|---|---|---|
| #420 | `runtime/src/statements/shift.ts` | none - **PR #2152** open (`shift-byte-mode-not-bytelike`), SAP-verified (`ZTRANSP_420`) |
| #419 | `runtime/src/types/structure.ts` `set` | none - fixed on local branch `structure-move-char-fragments` (6a4fa007), SAP-verified (`ZTRANSP_419`, test snippet `ZTRANSP_419T`), perf suite flat; **PR #2153** open. Gap: raw non-digits into `n` inside a fragment (needs `numc.ts`, after #2143/#2145) |
| #2140 | `runtime/src/statements/sort.ts` | none (#2086/#2088/#2089 are insert/append) |
| #419, then #427 (separate PRs; same function) | `runtime/src/types/structure.ts` `set`/`setCharacter` (l. 115-163) | none; #1955 only edits `getOffset` (~l. 190) |
| #427 case 5 | `runtime/src/statements/write.ts` | none; #2122 edits the transpiler's `write.ts` |
| #1939 int8 -> string/c | `types/character.ts`, `types/string.ts` | low: #1955 edits `getOffset` + line-1 import |
| #2139 AS TEXT | runtime `sort.ts` (free), transpiler `sort.ts` + `for_groups.ts` | low: #2080 changes one `findVariable` line in each |
| #2136 | `statements/assign.ts` | our #2141 - stack on it or wait |
| Numbers -> n | `types/numc.ts` | our #2143/#2145, #1955 - wait |
| #2042 + F2 | `types/integer8.ts`, operators | #1964, #2014, #2013, #1962, #1955 - wait |

Order: #420 (PR #2152), #419 (PR #2153), #2140, then #1939, #2139; #2136 after #2141.

**#427 waits until the #419 PR (#2153) is merged.** Both change `Structure.set` in
`types/structure.ts` (#427 cases 3-4 are in `setCharacter`, next to the #419 fragment move).
Start #427 from `upstream/main` once #419 is in. Case 5 (`WRITE` of a ref ->
`OBJECTS_NOT_CHARCONV`, `statements/write.ts`) could go first on its own, but keep #427
as one PR unless that is decided otherwise.

### Closed

The other 23 issues are closed (14 of them, mostly 2021, without a linked PR).

## Next

1. Plan item 5: comment on #1964 (SAP 816 results; offer rebase onto #2041 and ABAP tests).
2. Plan item 6: #1939 sign placement (int8 -> string/c).
3. Plan item 7: #2042 overflow, after #2014's direction is settled.
4. Decide on "Numbers -> n" above.
5. Work through "Open, no PR yet" (goal: close all our issues). The 2021 issues were
   re-tested 2026-11-19 and all still reproduce. #420 -> PR #2152; #419 -> PR #2153;
   #427 after #2153 is merged; meanwhile #2140.
