# Agenda

## Status 2026-11-22 (issues and PRs by arcanist123)

upstream/main of transpiler at `0b618827`. Re-check with:

```sh
for r in abaplint/transpiler abaplint/abaplint; do gh pr list --repo $r --author arcanist123 --state open --json number,mergeable,mergeStateStatus,title --jq '.[]|"\(.number) \(.mergeable)/\(.mergeStateStatus) \(.title)"'; done
```

### abaplint/transpiler

Issues: 39 open, 45 closed. PRs: 9 open, 35 merged since 2026-11-19.

Open PRs (all CI green, no reviews yet; all mergeable, "behind" only):

| PR | Branch | Closes | Notes |
|---|---|---|---|
| #2237 | `int8-float-operands` | (#2231, not linked) | opened 2026-11-22 |
| #2233 | `unary-minus-operand` | #2170 | 2026-11-22 merged main in (test conflict with #2235 in `arithmetics_precedence.ts`, kept both) |
| #2218 | `i-overflow` | #2189, #2192 | |
| #2217 | `int-to-char-overflow` | #2193 | |
| #2212 | `f-template-17-digits` | (#2185, not linked) | 2026-11-22 merged main in (conflict with #2219 in `template_formatting.ts`, kept both) |
| #2209 | `f-to-p-round-half-away` | #2187 | |
| #2201 | `class-constructor-first-use` | #1849 | 2026-11-22 merged main in (conflict with LOCAL #2072 in `form.ts` / `function_module.ts`: entry checks, then the LOCAL `try`) |
| #2169 | `int8-overflow` | #2042 | |
| #2151 | `int8-value-literal` | #2150 | |

Merged since 2026-11-19: #2137, #2138, #2141, #2143, #2145, #2147, #2149, #2152, #2153, #2154,
#2155, #2158, #2159, #2161, #2162, #2163, #2168, #2173, #2184, #2191, #2194, #2198, #2200, #2208,
#2210, #2211, #2214, #2216, #2219, #2220, #2221, #2228, #2235, #2236.

Issues closed since 2026-11-19: #406, #417, #419, #420, #427 (not planned), #2022, #2140, #2142,
#2144, #2146, #2148, #2156, #2157, #2160, #2176, #2186, #2190, #2202, #2203, #2206, #2207, #2232, #2234.

Open issues without a PR (31):

| Area | Issues |
|---|---|
| ASSIGN / AS TEXT | #2136 (larshp commented), #2139 (check what is left after #2159/#2161) |
| int8 | #2165 (`**` in f), #2166 (p vs int8), #2195 (ipow), #2196 (text with decimals), #2197 (DECIMALS in template) |
| p | #2167 (above 2^53), #2171 (MOD), #2172 (overflow exception), #2174 (p to c) |
| n | #2175 + #2213 (number to n, local `numeric-to-numc`), #2204 (x <-> n), #2205 (offset write) |
| decfloat34 | #2177, #2178, #2179, #2180, #2181, #2182, #2183 |
| f | #2188 (beyond double range) |
| b / s | #2199 |
| CORRESPONDING | #2222, #2223, #2224, #2225, #2226, #2227 |
| structures | #2229 |

### abaplint/abaplint

Issues: 9 open, 15 closed. PRs: 9 open, 22 merged since 2026-11-19.

Open PRs (all CI green, no reviews yet):

| PR | Branch | Closes | State |
|---|---|---|---|
| #4638 | `prefix-me-attribute-call` | (#2033) | mergeable, behind |
| #4636 | `type-me-static-arrow` | | mergeable, behind |
| #4635 | `read-only-attribute-write` | #2097 | mergeable, behind |
| #4633 | `type-before-definition` | #2556 | mergeable, behind |
| #4631 | `integer-bytes` | #4630 | mergeable, behind |
| #4629 | `alias-name-conflicts` | #2685 | **CONFLICTING** - merge main |
| #4628 | `for-testing-in-non-test-class` | #2612 | mergeable, behind (larshp 2026-11-21: "check conflicts" - now clean) |
| #4626 | `implement-methods-duplicates` | #3212 | mergeable, behind |
| #4625 | `me-in-static-method` | #3560 | mergeable, behind |

Merged since 2026-11-19: #4545, #4551, #4600, #4602, #4603, #4611, #4612, #4614, #4615, #4616,
#4617, #4618, #4619, #4620, #4621, #4622, #4627, #4632, #4634, #4637, #4639, #4641.

Issues closed since 2026-11-19: #1988, #4482, #4599, #4608, #4609, #4610, #4613.

Open issues (no comments yet): #4630 (PR #4631); without a PR: #4642 (fragment views, see #2229),
#4643, #4644, #4645 (DATASET), #4647 (ABAP Doc chained), #4648 (VALUE row type), #4655 (ABAP Doc
HTML tag), #4656 (text literal to xsequence, transpiler side done in #2236).

### Other repos

open-abap/open-abap-core#1344 (CL_ABAP_CORRESPONDING) still open.

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
for n in 2143 2145 2147 2149 2151 2141 2152 2153 2154 2155 1964 2014; do gh pr view $n --repo abaplint/transpiler --json number,state,mergeable,reviewDecision --jq '"#\(.number) \(.state) \(.mergeable) \(.reviewDecision)"'; done
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
| class constructors at first use | #1849 | #2201 | `class-constructor-first-use` | opened 2026-11-20 | approved by larshp in #1849; stacked on #2162 (dynamic call of local class), the dynamic-call test needs it |

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
   2026-11-20: now tracked upstream as #2175 (p) + comment there for i, f, decfloat34,
   arithmetic results and p above 2^53 -> the local fix can go as the PR for #2175.
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
| #1849 class constructor runs too early | #2201 (needs #2162) |

### Open, no PR yet - need a fix

| Issue | Opened | Topic | First step |
|---|---|---|---|
| #2136 | 2026-11-19 | ASSIGN with offset/length gives a copy, writes do not reach the data object | follow-up announced in #2137; also unblocks ASSIGN INCREMENT on partial components |
| #2139 | 2026-11-19 | AS TEXT: SORT ignores it, FOR GROUPS / LOOP AT GROUP BY throw a todo | GROUP BY landed in #2138 - re-check what is left |
| #2140 | 2026-11-19 | SORT of a table WITH EMPTY KEY sorts rows; SAP keeps order | |
| #419 | 2021-05-23 | structure move does not transfer all components | still broken, see re-test below |
| #420 | 2021-05-23 | SHIFT in byte mode should raise for a dynamic type | still broken, see re-test below |
| ~~#427~~ | 2021-05-26 | runtime assignment should throw an error instead of breaking | **closed 2026-11-20, not planned**: replicating short dumps is out of scope |

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
| #2140 | `runtime/src/statements/sort.ts` | none (#2086/#2088/#2089 are insert/append) - **PR #2154** open (`sort-empty-key`), SAP-verified (`ZTRANSP_2140`) |
| #419, then #427 (separate PRs; same function) | `runtime/src/types/structure.ts` `set`/`setCharacter` (l. 115-163) | none; #1955 only edits `getOffset` (~l. 190) |
| #427 case 5 | `runtime/src/statements/write.ts` | none; #2122 edits the transpiler's `write.ts` |
| #1939 int8 -> string/c | `types/character.ts`, `types/string.ts`, test in `test/types/integer8.ts` (near the top, not at the end) | none in practice: trial merge (`git merge-tree`) clean with #2143/#2145/#2149/#2151; #1955 already conflicts with main in 4 other files, ours adds none. **PR #2155** open (`int8-to-text-sign`), SAP-verified (`ZTRANSP_1939`) |
| #2139 AS TEXT | runtime `sort.ts` (free), transpiler `sort.ts` + `for_groups.ts` | low: #2080 changes one `findVariable` line in each |
| #2136 | `statements/assign.ts` | our #2141 - stack on it or wait |
| Numbers -> n | `types/numc.ts` | our #2143/#2145, #1955 - wait |
| #2042 + F2 | `types/integer8.ts`, operators | #1964, #2014, #2013, #1962, #1955 - wait |

Order: #420 (PR #2152), #419 (PR #2153), #2140 (PR #2154), #1939 (PR #2155), then #2139; #2136 after #2141.

**#427 closed 2026-11-20 as not planned (dump replication out of scope) - the plan below is obsolete.** ~~#427 waits until the #419 PR (#2153) is merged.~~ Both change `Structure.set` in
`types/structure.ts` (#427 cases 3-4 are in `setCharacter`, next to the #419 fragment move).
Start #427 from `upstream/main` once #419 is in. Case 5 (`WRITE` of a ref ->
`OBJECTS_NOT_CHARCONV`, `statements/write.ts`) could go first on its own, but keep #427
as one PR unless that is decided otherwise.

### Closed

The other 23 issues are closed (14 of them, mostly 2021, without a linked PR).

## Next

1. Plan item 5: comment on #1964 (SAP 816 results; offer rebase onto #2041 and ABAP tests).
2. Plan item 6: #1939 sign placement (int8 -> string/c) -> PR #2155.
3. Plan item 7: #2042 overflow, after #2014's direction is settled.
4. Decide on "Numbers -> n" above.
5. Work through "Open, no PR yet" (goal: close all our issues). The 2021 issues were
   re-tested 2026-11-19 and all still reproduce. #420 -> PR #2152; #419 -> PR #2153;
   #427 closed as not planned (2026-11-20); #2140 -> PR #2154.
6. Type n coverage (2026-11-20): tests PR #2208 (probe ZTRANSP_NUMC, ZTRANSP_NUMC_T on A4H).
   New issues #2202 text->n, #2203 compare, #2204 x<->n, #2205 offset write, #2206 blanks
   (SHIFT/TRANSLATE), #2207 ALPHA = OUT; comments on #2175, #2167, #2189, #2192, #2176.

## Type n issues #2202-#2207 (plan 2026-11-21)

All open, no comments, not assigned. Measured on ABAP 816; re-confirm each case on A4H
before writing the test. One PR per issue.

| Issue | Problem | Files | Overlap |
|---|---|---|---|
| #2202 **PR #2214** | text -> n keeps only a leading number (`'12.5'` -> `00012`, `'#'` -> `00NaN`); SAP keeps every digit, drops the rest | `types/numc.ts` `set()` string branch | #1955 (imports, `getOffset`) - none |
| #2203 **PR #2216** | n vs c / string / n of other length compared as text; SAP numeric + `CONVT_NO_NUMBER` | `compare/*`, `read_table.ts`, table expressions | none |
| #2175 + #2213 | p, i, f, decfloat34 -> n truncate and keep the sign; SAP: absolute value, rounded half away from zero | `numc.ts` number / Float / Packed / DecFloat34 branches | local `numeric-to-numc` (2a68dbdb) **conflicts with #2214** (decfloat34 branch) |
| #2204 | x -> n gives zeros, n -> x reads digits as hex; SAP goes through i | `numc.ts`, `hex.ts` `set()` | #1964 (`hex.ts` l. 50-67) and #1955 - **check #1964's hunk first** |
| #2205 | `lv_n(2) = 7` replaces whole field | `offset_length.ts` `set()` | #1955 (constructor parsing) - low |
| #2206 | n loses blanks after SHIFT / TRANSLATE | `statements/shift.ts`, `translate.ts`, `numc.ts` raw set | none |
| #2207 | `ALPHA = OUT` on n drops field length; all zeros -> empty | `alpha.ts` `alphaOut` | #2212 other lines - low |

Fix plan (investigated 2026-11-21, upstream/main `7e9407b5`):
- **#2175 + #2213:** rebase `numeric-to-numc` onto `numc-text-digits`, replace #2214's
  comma-split decfloat34 branch with the `roundToBigInt` one; one PR closes both.
- **#2206:** `raw = true` only skips zero padding, the string branch still trims and drops
  non-digits. Add a character-mode setter (`Numc.setCharacter(text)`: text as is, blank-padded
  / cut to length), use it in `shift.ts` l. 86 and in `translate.ts` for n targets.
  Probe first: CONCATENATE / REPLACE / OVERLAY / CONDENSE into n; compare and arithmetic
  with an n holding blanks (`'123  '`).
- **#2205:** in `OffsetLength.set()` for a Numc target, convert the source to a temporary
  Numc of the part length (no length: field length - offset), splice, store with the
  #2206 setter. Stack on #2206.
- **#2207:** `alphaOut` for a Numc source: strip leading zeros, `"0"` if nothing is left,
  pad right with blanks to `getLength()`. `c` and plain values unchanged.
- **#2204:** `Numc.set` gets a Hex branch (hex read as integer, like x -> i, then the number
  branch); `Hex.set` gets a Numc branch through the number path, placed after the
  `Hex || XString` branch (away from #1964's hunk). Probe first: x > 4 bytes into n,
  x `FFFFFFFF` into n, n > 10 digits into x.

#2207 status: **PR #2220** (`n-alpha-out`, 06f23444). SAP-verified with
`ZTRANSP_2207` (exact test snippet). Wider than the issue: the rule is the same for `c`
(field length kept, all zeros -> `0`, `'00A1'` kept) and string (text length); WIDTH
replaces the length even when smaller (`WIDTH = 2` on `00123` -> `123`). `alphaOut` kept
unchanged (public API), new `alphaOutTemplate`.

2026-11-21: #2220 rebased on upstream/main (import-line conflict with #2219), mergeable again.

#2206 status: **PR #2221** (`n-character-blanks`, a5620966). SAP-verified
(`ZTRANSP_2206` probe, test snippet `ZTRANSP_2206T` with the same ASSERTs). Not stacked on
#2214 after all: new branches at the top of `Numc.set`, trial merge with #2214 clean.
Scope found on SAP and included: SHIFT, TRANSLATE, REPLACE, CONCATENATE, CONDENSE store raw
text (letters too) via new `statements/_set_text.ts`; n -> n of other length is a right-aligned
text copy (`'  123'` -> n7 `00  123`); n trailing blanks dropped in templates, into string and
as REPLACE operand (existing `SHIFT numc` test); n with letters -> i raises
CX_SY_CONVERSION_NO_NUMBER; transpiler `translate.ts` passes the USING mask with trailing blanks
(`USING '0 '` was emitted as `'0'`, also wrong for c).
Conflicts with #2220 on the `template_formatting.ts` import line (both add `Numc`) - rebase
whichever merges second.
Left out / follow-ups: OVERLAY into n goes through OffsetLength (#2205); n `'  123'` vs n7
`'00  123'` gives CONVT_NO_NUMBER locally, SAP says not equal (#2216 compare logic).

Order: #2207 (independent) now; after #2214 merges: #2175/#2213, #2206, #2205
(all `numc.ts`, #2205 needs the #2206 setter); #2204 last.

## MOVE-CORRESPONDING / CORRESPONDING (reviewed 2026-11-21)

Code: transpiler `statements/move_corresponding.ts` (passes Source + SimpleTarget only, drops
EXACT / KEEPING TARGET LINES / EXPANDING NESTED TABLES), `expressions/corresponding_body.ts`
(handles Source, BASE, MAPPING; anything else -> `CorrespondingBodyTranspiler, todo`), runtime
`statements/move_corresponding.ts` (structures only, recurses when the target component is a
Structure, else `set`).

Probes on A4H in `$TMP`: `ZTRANSP_CORR` (50 cases, `P_CASE` 0 = all except the dump case 6),
`ZTRANSP_CORR2` (cross-level MAPPING, self MAPPING, l06 sub structure MAPPING), `ZTRANSP_CORR3`
(CL_ABAP_CORRESPONDING), exact test snippets `ZTRANSP_CORR_T` + `ZTRANSP_CORR_T2` (self MAPPING
gives an activation warning, ImportFromFile refuses it -> WriteSource). Scratch cases + runner:
scratchpad `corr/` (`cases.txt`, `tests.txt`, `run.js`, `gen*.js`).

**PR #2228** (`corresponding-tests`): 34 tests (14 MOVE-CORRESPONDING, 20 CORRESPONDING), all
passing on main, all matching A4H.

| Finding | System | Transpiler | Tracked by |
|---|---|---|---|
| "curious" same-length structures: `MAPPING t = s` with sub structures c5+c10 -> c7+c8 | by component name (`[][]` no common names; `[abcde][01234567]` same names; BASE keeps others) | fragment move by position `[abcde01][23456789]` | **#2222** |
| plain `s2 = s1` c5+c10 -> c7+c8 | fragment move `abcde01`/`23456789` | same (from #2153) | ok |
| MOVE-CORRESPONDING / CORRESPONDING, same names c5+c10 -> c7+c8 (also nested, table rows) | by name | by name | ok, in #2228 |
| EXCEPT, EXCEPT * (structure + table) | works | transpile error | **#2223** |
| DEEP | works | transpile error | **#2224** |
| DISCARDING DUPLICATES; duplicates into unique key without it | first row kept; dump ITAB_DUPLICATE_KEY | transpile error; duplicate silently skipped | **#2225** |
| BASE with internal tables | base rows + source rows | `table, no header line` | **#2226**, likely fixed by #2076 |
| MOVE-CORRESPONDING elementary -> sub structure of same name | assigned (`ab`) | nothing assigned | **#2227** |
| MOVE-CORRESPONDING itab TO itab, KEEPING TARGET LINES, EXPANDING NESTED TABLES | - | `table, no header line` | open PRs #2076 (flujo-app), #2059 (NabheetCloud) - not filed |
| CL_ABAP_CORRESPONDING (dynamic mapping table) | works (`mapping_component` for structure + table) | class not found | **open-abap/open-abap-core#1344** |
| MAPPING across nesting levels (`MAPPING a = sub-x`) | activation warning, then dump UC_OBJECTS_NOT_CONVERTIBLE | works (gives 3) | not filed: transpiler is more permissive; hard to phrase without system output |
| MOVE-CORRESPONDING EXACT | not probed (no CX_SY_* classes in tests) | EXACT ignored | not filed |

Plain assignment of the #2222 shapes (probe `ZTRANSP_2222`, 2026-11-21): substructure to
substructure, outer `s2 = s1` (names differ or same), MOVE, both directions, total length 15 -> 17
and 17 -> 15, field symbols `TYPE any`, c5|i|c10 -> c5|i|c7+c3 all move by fragments (one char
block), **transpiler matches all 12**. `CORRESPONDING #( s1-s )` into such a substructure: by name
(`[][]`), matches. So the #2222 fix must touch only the MAPPING path.
New gap: c5|i|c10 -> c7|i|c8 through `<any>` (first char fragment differs before a non-char
component) dumps UC_OBJECTS_NOT_CONVERTIBLE; transpiler silently moves component-wise
(`[abcde][42][01234567]`). `moveByFragments` returns false and `Structure.set` falls back. Fits
#427 in kind (closed 2026-11-20, not planned). User's rule (2026-11-21): the dump's exact shape does
not matter, but system and transpiler must both fail or both work -> filed **#2229**. Static
`mix3 = mix1` is a syntax error on the system, abaplint accepts it -> **abaplint/abaplint#4642**
(also `c5|i -> i|c5`; matching layouts c5+c10 -> c7+c8 and c5|i|c10 -> c5|i|c7+c3 accepted on
both; checked with abaplint 2.120.112 and 2.120.113). Fix idea: in `Structure.set`, both flat + fragment views mismatch -> throw
instead of the component-wise fallback; run the perf suite (hot path).
2026-11-21: comment on #2222 posted (plain assignment already matches, fix only MAPPING).

Notes:
- `mapping_except_component` without `srcname` had no effect in the probe - check the kind semantics
  before implementing #1344.
- Static MAPPING for tables works: several components, sorted target key, empty/hashed sources, as
  method argument (`ZTRANSP_CORR` t07; not in #2228 because it needs a class).

Fix order: #2227 (small, runtime), #2222 (transpiler: moveCorresponding for structured MAPPING
pairs), #2223 EXCEPT, #2225; #2224 DEEP and #2226 after #2076 merges (reuse its table branch and
`expandingNestedTables`).

## Done

Merged as of 2026-11-21: #2141 (ASSIGN COMPONENT type), #2143 (int8 -> n), #2145 (text -> n
above 2^53), #2147 (nmax/nmin int8), #2149 (int8 vs x), #2152 (#420 SHIFT BYTE MODE),
#2153 (#419 structure fragments), #2154 (#2140 SORT EMPTY KEY), #2155 (#1939 int8 sign),
#2168 (hex -> int8, last eight bytes), #2208 (n tests).
Still open as of 2026-11-22: see "Status 2026-11-22" at the top (#2162 merged 2026-11-21, so #2201 is no longer blocked).

2026-11-21: #2202 -> PR #2214 (`numc-text-digits`). decfloat34 -> n rounding split out as
#2213 (truncates, SAP rounds half away from zero; sign already dropped by #2214).
#2151 rebased on upstream/main (test conflict in `integer8.ts`, kept both), mergeable again.
