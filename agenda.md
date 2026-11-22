# Agenda

Rewritten 2026-11-22. ABAP behaviour below is what we expect from the ABAP keyword
documentation and experience; the history of this file has the older, longer notes.

Re-check open PRs with:

```sh
for r in abaplint/transpiler abaplint/abaplint; do gh pr list --repo $r --author arcanist123 --state open --json number,mergeable,mergeStateStatus,title --jq '.[]|"\(.number) \(.mergeable)/\(.mergeStateStatus) \(.title)"'; done
```

## Status 2026-11-22, 14:40 UTC

No conflicts left (#4628 resolved 2026-11-22). Conflicts validated with a local test merge (`git merge-tree`) of every open PR branch into
the newest upstream main, not only GitHub's flag.

### abaplint/transpiler

Issues by us: 38 open, 46 closed. PRs: 7 open, 36 merged since 2026-11-19.
upstream/main at `2c4ef6f9`.

Open PRs - CI green, no reviews or comments; test merge clean for all:

| PR | Branch | Closes | Behind main |
|---|---|---|---|
| #2237 | `int8-float-operands` | #2231 (not linked in the PR) | 7 |
| #2218 | `i-overflow` | #2189, #2192 | 13 |
| #2217 | `int-to-char-overflow` | #2193 | 12 |
| #2209 | `f-to-p-round-half-away` | #2187 | 14 |
| #2201 | `class-constructor-first-use` | #1849 | 3 (main merged in 2026-11-22, LOCAL #2072 conflict) |
| #2169 | `int8-overflow` | #2042 | 14 |
| #2151 | `int8-value-literal` | #2150 | 11 |

Merged 2026-11-22: #2210, #2214, #2221, #2228, #2233 (closed #2170), #2235, #2236, #2212.
#2212 was only part of #2185 (plain text of f); ENGINEERING and EXPONENT for f are still open, so #2185 stays open.

Other people's PRs we depend on:

| PR | Topic | State | Why it matters |
|---|---|---|---|
| #1964 (oisee) | int8 <-> x / xstring byte layout (#1963, #1673) | open, changes requested | x longer than 8 bytes vs int8; `hex.ts` hunk overlaps #2204 |
| #2014 (oblomov-dev), #1955 (oisee) | `i` overflow raises | open | overlap with our #2218 |
| #2076 (flujo-app), #2059 (NabheetCloud) | MOVE-CORRESPONDING for internal tables | open, #2076 conflicting | #2224 DEEP and #2226 BASE build on it |

### abaplint/abaplint

Issues by us: 9 open, 15 closed. PRs: 7 open, 24 merged since 2026-11-19.
upstream/main at `6a069fee2`.

| PR | Branch | Closes | Test merge | Notes |
|---|---|---|---|---|
| #4638 | `prefix-me-attribute-call` | (#2033) | clean, 11 behind | |
| #4636 | `type-me-static-arrow` | | clean, 11 behind | |
| #4635 | `read-only-attribute-write` | #2097 | clean, 11 behind | |
| #4633 | `type-before-definition` | #2556 | clean, 11 behind | |
| #4631 | `integer-bytes` | #4630 | clean, 1 behind | larshp 14:28 "hmm"; we asked whether he prefers another approach - **waiting for his answer** |
| #4628 | `for-testing-in-non-test-class` | #2612 | clean (main merged in 2026-11-22) | conflict was `test/abap/syntax/syntax.ts`: our #4625 appended tests at the same spot - kept both |
| #4626 | `implement-methods-duplicates` | #3212 | clean, 13 behind | |

Merged 2026-11-22: #4634, #4639, #4641, #4629, #4625.

Open issues, no comments: #4630 (PR #4631); without a PR: #4642 (flat structures with
non-matching fragment views accepted, see transpiler #2229), #4643, #4644, #4645 (DATASET
statements), #4647 (ABAP Doc before a chained statement), #4648 (VALUE row of another numeric
type), #4655 (ABAP Doc HTML tag), #4656 (text literal to an xsequence parameter; transpiler side
done in #2236).

### Other repos

open-abap/open-abap-core#1344 (CL_ABAP_CORRESPONDING missing) - open.

## Goal: close all our transpiler issues

32 open issues need a fix and have no PR.

| Area | Issues |
|---|---|
| ASSIGN / AS TEXT | #2136 (larshp commented; #2141 is merged, so unblocked), #2139 (check what is left after #2159 / #2161) |
| int8 | #2165 (`**` expected in f), #2166 (p vs int8 through a double), #2195 (ipow), #2196 (text with decimals), #2197 (DECIMALS in a template) |
| p | #2167 (above 2^53), #2171 (MOD rounds the remainder), #2172 (overflow exception class), #2174 (p to c) |
| n | #2175 + #2213 (number to n), #2204 (x <-> n), #2205 (offset write) |
| decfloat34 | #2177, #2178, #2179, #2180, #2181, #2182, #2183 |
| f | #2185 (PR #2241), #2188 (beyond the double range) |
| b / s | #2199 |
| CORRESPONDING | #2222, #2223, #2224, #2225, #2226, #2227 |
| structures | #2229 |

## Plans

### Type n

- **#2175 + #2213 (number to n):** local branch `numeric-to-numc` (`2a68dbdb`) has the fix:
  absolute value, rounded half away from zero. #2214 is merged now - rebase on main, use the
  `roundToBigInt` decfloat34 branch instead of #2214's comma split; one PR closes both.
- **#2205 (`lv_n(2) = 7` replaces the whole field):** in `OffsetLength.set()` for a Numc
  target, convert the source to a temporary Numc of the part length (no length: field length
  minus offset), splice it in, store with the character setter from #2221 (merged).
  OVERLAY into n goes the same way.
- **#2204 (x <-> n):** `Numc.set` gets a Hex branch (hex read as an integer, like x to i, then
  the number branch); `Hex.set` gets a Numc branch through the number path, placed after the
  `Hex || XString` branch so it stays away from #1964's hunk. Cases to think through first:
  x longer than 4 bytes into n, x `FFFFFFFF` into n, n longer than 10 digits into x.
- Follow-up from #2221: n `'  123'` compared with n7 `'00  123'` is expected to be not equal;
  the transpiler raises a conversion error (compare logic from #2216).

Order: #2175/#2213, #2205, #2204.

### CORRESPONDING

Code: transpiler `statements/move_corresponding.ts` (passes only Source and SimpleTarget, drops
EXACT / KEEPING TARGET LINES / EXPANDING NESTED TABLES), `expressions/corresponding_body.ts`
(Source, BASE, MAPPING; anything else is a todo), runtime `statements/move_corresponding.ts`
(structures only).

Tests are in main (#2228). Open:

| Issue | Expected | Transpiler |
|---|---|---|
| #2222 | `MAPPING t = s` with sub structures goes by component name | moves by position (fragments); plain `s2 = s1` already right, so only the MAPPING path changes |
| #2223 | EXCEPT, EXCEPT * | transpile error |
| #2224 | DEEP | transpile error |
| #2225 | DISCARDING DUPLICATES keeps the first row; without it a duplicate into a unique key is a runtime error | transpile error; duplicate skipped silently |
| #2226 | BASE with internal tables: base rows + source rows | `table, no header line` (likely fixed by #2076) |
| #2227 | MOVE-CORRESPONDING elementary component into a sub structure of the same name is assigned | nothing assigned |

Order: #2227 (small, runtime), #2222, #2223, #2225; #2224 and #2226 after #2076 merges (reuse
its table branch and `expandingNestedTables`).

Not filed: MOVE-CORRESPONDING EXACT (ignored today); MAPPING across nesting levels
(`MAPPING a = sub-x`) is expected to fail, the transpiler is more permissive.

### Structures (#2229)

Move through `<any>` between flat structures whose fragment views differ (c5|i|c10 -> c7|i|c8)
is expected to fail; the transpiler falls back to a component-wise move. Rule: the exact error
does not matter, but both must fail or both must work. Fix idea: in `Structure.set`, when both
are flat and `moveByFragments` returns false, throw instead of falling back. Hot path - run the
performance suite. Static side is abaplint#4642.

### Not filed / to decide

0. abaplint#4658 (filed): `StringTemplateFormatting` allows `STYLE =` only alone; STYLE with DECIMALS,
   WIDTH/ALIGN, and SCIENTIFIC with EXPONENT should parse (STYLE + SIGN and non-SCIENTIFIC STYLE +
   EXPONENT are expected to be syntax errors; EXPONENT on i/p too). Probe report ZTRANSP_F_ENG.

1. int8 vs xstring comparison - not covered by #2149.
2. x longer than 8 bytes vs int8 - depends on #1964.
3. 8-byte hex through `parse( )`: `Math.pow` two's complement loses sign and precision for
   `x LENGTH 8` wherever a number is used (`x8` vs `i`, `p`, `f`).
4. Conversion overflow into int8 from string, `f`, `p` (no exception today) - check what
   #2169 / #2218 leave over.
5. `WRITE TO` sign and thousands separators (user settings dependent).
6. CL_ABAP_CORRESPONDING: `mapping_except_component` without `srcname` - look up the kind
   semantics before implementing open-abap-core#1344.

## Next

1. Link #2231 in #2237 so it closes on merge.
2. #4631: wait for larshp to say how he wants it handled.
3. #2175 + #2213 PR from `numeric-to-numc`.
4. #2227, then #2222 (CORRESPONDING).
5. #2205, #2204 (n).
6. #2136, #2139.
7. #2229.

## decfloat16 (#963), 2026-11-22

Split by topic, each `Refs #963`; probe report ZTRANSP_DF16.
1. #2244 `decfloat16-precision`: DecFloat16 runtime type, 16 digit rounding half away from
   zero on store, CREATE DATA TYPE ('DECFLOAT16'). Open.
2. `decfloat16-range` (on 1): CX_SY_CONVERSION_OVERFLOW above 9.999999999999999E384,
   subnormals to 1E-398. Open the PR after #2244 is merged; last one, use `Closes #963`.
3. `decfloat16-describe` (on 1): DESCRIBE FIELD type `a`, 8 bytes. Open after #2244.
   open-abap RTTI must map `a` to typekind_decfloat16 (separate repo).
Left out: WRITE list output (output length 24, separators), DESCRIBE OUTPUT-LENGTH,
ASSIGN CASTING size (8 bytes), ASSIGN type conflict df16 vs df34, dynamic
CREATE DATA TYPE ('DECFLOAT34'), the decfloat34 range.
