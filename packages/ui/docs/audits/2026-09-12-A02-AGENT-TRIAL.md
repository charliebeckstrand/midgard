# A02 Agent Trial — the five `bug-*` agents against a generalized audit

**Date:** 2026-09-12 · **Scope:** segment `A02` (`674adc3`) — calendar and data-display 1/2, 71 files and 5,841 lines at the partition. **Method:** two arms read the same 71 files, blind to each other. One common blind judge then ruled on the union of their claims. **Question:** do the five specialist agents under [`.claude/agents/bug`](../../../../.claude/agents/bug) beat the general-purpose agents that they replace? **Plan:** [`2026-09-11-BUG-SWEEP-PLAN.md`](../plans/2026-09-11-BUG-SWEEP-PLAN.md).

**This document is neither an audit nor a plan.** An audit is a single-lens sweep of the package, and [`CONVENTIONS.md`](../../../../CONVENTIONS.md) §12.4 deletes it when its last row closes; this document sweeps no lens, and its result must outlive the bug audit, so it carries no `-AUDIT` suffix and no pass must delete it. A plan holds a design; this document holds a measurement and decides nothing. It follows [`2026-09-11-TEST-ARCHITECTURE.md`](2026-09-11-TEST-ARCHITECTURE.md), which is the precedent in this directory for a dated report under neither rule.

**No row of `A02` enters the bug audit from this document, no ledger cell moves, and no defect is fixed. The trial stops at the review gate.**

## Executive summary

> **Read [Round 2](#round-2--what-a-second-run-changed) before you act on this section.** A later
> set of tests measured run-to-run variance and found it large enough to dominate the arm
> comparison below. The round-1 counts stand as measured; the reading of them changes.

Neither arm won. The treatment found more, and the control found better.

Arm T raised 23 claims and 17 survived the judge. Arm C raised 11 claims and all 11 survived. The union holds 21 distinct defects. Arm T found 17 of them and Arm C found 11, and the 7 that both arms found are the overlap. Arm T therefore missed 4 defects and Arm C missed 10.

Precision reverses the result. Arm T raised 6 claims that the judge refuted, so 26 percent of its output was wrong. Arm C raised no claim that the judge refuted. The control's extra step is its own verification, and that step is what buys the difference.

The control also won on cost, on wall clock, and on agent invocations, and the two arms tied on file coverage. The treatment won on yield, on per-defect cost, and on the one metric that the plan cares about most: it found the only defect in the segment that a shipped surface reaches today.

The head-to-head test is the sharpest number here. Arm C read and rejected 7 of the defects that Arm T raised. The judge agreed with Arm C twice and disagreed with it four times, and it narrowed one claim rather than killing it. A generalist that judges its own claims therefore throws away real defects at about twice the rate that it catches false ones.

## What ran

The partition script confirmed the scope before the trial started: `A02` at `674adc3`, 71 files, 5,841 lines, in two units. `A02-u1` (`1e3a282`) holds the 14-file calendar theme. `A02-u2` (`8989cbd`) holds 57 files of data-display part 1. No agent derived a file list or a hash; the script printed both, and the dispatcher handed them out.

**Arm T, the treatment.** One `bug-sweeper` read each unit and judged nothing. The dispatcher stripped the `evidence` block from each claim. One `bug-verifier` then judged each unit blind and batched, and it answered the reach question inside that pass, which segment `A01` skipped. Four agent invocations.

**Arm C, the control.** One general-purpose agent read each unit and did the whole job: it found the defects, judged them, ranked them, grouped them, and proposed the ordered steps. It received the same file lists, the same out-of-scope rules, the same intent sources, and the same consumer roots. It did not receive the specialist decomposition: no separate blind verifier, no batched verification pass, no separate recorder. Two agent invocations.

**The judge.** Both arms' claims went to one common `bug-verifier` pass per unit, over the union for that unit. The dispatcher stripped every claim to `file`, `symbol`, `trigger`, `wrongResult` and `contract`, removed every line number, and gave each claim a neutral id. A seeded shuffle set the order, so the id carried no arm signal. The judge learned that several readers had read the unit independently, and that duplicates were possible. It did not learn that two arms existed, and it did not learn that an architecture was under test.

The two arms ran at the same time, so neither could read the other's output, and neither wrote a file. The trial declared its metrics before any agent ran.

## Results

### Claims, verdicts, and precision

| metric | Arm T | Arm C | winner |
|---|---|---|---|
| claims raised | 23 | 11 | — |
| CONFIRMED by the judge | 16 | 11 | T |
| RESTATED by the judge | 1 | 0 | — |
| REFUTED by the judge | 6 | 0 | **C** |
| claims that survived | 17 | 11 | T |
| precision (survived ÷ raised) | 74% | 100% | **C** |

Arm T's raised count is not comparable to Arm C's without this caveat. A `bug-sweeper` judges nothing, so its 23 claims are unfiltered. Arm C judges its own claims inside the find stage, so its 11 findings are already filtered; it considered and dropped 27 more. The correct comparison is the survivor count and the precision, and those two columns disagree about the winner.

### Severity after the reach pass

| severity | Arm T | Arm C |
|---|---|---|
| medium-high | 0 | 1 |
| medium | 7 | 5 |
| low | 10 | 5 |

Arm C's survivors are the heavier set. Six of its 11 rows are medium or above, against 7 of Arm T's 17. Arm C also raised the single most severe row in the segment: `C-U1-03`, at medium-high, where the calendar's rendered month is write-only, so a parent's focus write silently discards the month navigation that the user just performed. The judge confirmed it and named `apps/places/src/components/place-form-drawer/place-form-drawer.tsx:173` as the exact trigger on a real app route.

Arm T raised the only row in unit 2 that any shipped surface reaches: `A02-U2-C07`, at medium, where `k.column.over` is an empty class string, so a Kanban column paints no drop-target highlight during any drag. The judge found the reach at `packages/ui/src/docs/demos/components/kanban.tsx:63-86` and wrote that the branch "executes on a shipped surface on every drag".

Neither arm raised a high row, and the judge raised none.

### Root-cause groups

The judge found 10 groups over the union: 4 in unit 1 and 6 in unit 2. Eight of the 10 hold claims from both arms. Two hold claims from Arm T alone. None holds claims from Arm C alone.

This metric does not compare the arms cleanly, and the trial design is the reason. Grouping is a `bug-verifier` function, and the verifier in this trial was the common judge, so Arm T reported no groups of its own. Arm C reported 7 groups of its own, because its architecture puts the grouping inside the find stage. The honest reading is that Arm C demonstrated the capability and Arm T had it removed by the trial design. The group-participation counts above are the only arm-attributable figure.

### The defects that one arm found and the other missed

This asymmetry is the most informative number in the trial. The judge's own grouping confirmed each of the 7 overlaps as one defect named twice.

**Arm T found 10 that Arm C missed.**

In unit 1: the day grid cannot cross a month boundary with an arrow key (medium); `CalendarRange` never re-anchors the view after a parent sets an endpoint (low); two `nextMonth` calls in one handler coalesce into one (low); a form-bound `Calendar` still seeds its month from the `defaultValue` that §7.2 requires it to ignore (low).

In unit 2: the Kanban column paints no drop-target highlight (medium, and the only row with reach); the virtualized search seed never resets when the term clears (low, restated); `StatDelta` documents a `flat` trend that the recipe does not define (low); the uncontrolled `userOpen` map survives a `data` swap (low); `href` with `interactive={false}` puts two Tab stops on a reorderable row (low); the virtualized expansion set is seeded once and never re-derived (low).

**Arm C found 4 that Arm T missed.**

In unit 1: the rendered month is write-only, so parent-driven focus overwrites parent-driven navigation (medium-high).

In unit 2: `ensureFirstItemActive` cannot recover a tab stop stranded on a hidden item (low); `rootKey=""` de-synchronizes node paths from the exported `collectJsonTreePaths` (low); `stampTreePositions` collapses `aria-posinset` and `aria-setsize` through a wrapper component (low).

Arm T therefore found 81 percent of the 21 distinct defects and Arm C found 52 percent. Arm C's four are weighted toward the top of the severity range and Arm T's ten toward the bottom.

### Head to head: the claims that Arm C read and rejected

Arm C's dropped lists name 7 defects that Arm T raised. The judge ruled on Arm T's claim in each case, so each row grades Arm C's self-refutation directly.

| defect | Arm C's stated reason to drop it | judge | Arm C was |
|---|---|---|---|
| month-boundary arrow wrap | the hook documents "Wraps at both ends" | CONFIRMED, medium | wrong |
| `CalendarRange` never re-anchors | "Not reachable as a defect" | CONFIRMED, low | wrong |
| virtualized `defaultExpandDepth` | "zero reach"; the default is "evaluated once on mount" | CONFIRMED, low | wrong |
| `ListItem` two Tab stops | dropped a differently-framed version of it | CONFIRMED, low | wrong |
| virtualized search re-seed | "Self-healing; no reliable wrong result" | RESTATED, low | partly wrong |
| `hoverDate` paints a committed endpoint | named the guard that gates `hoverDate` on `rangeStart` | REFUTED | right |
| PivotTable `count` undercounts | "Documented twice ... Non-numeric cells are dropped" | REFUTED | right |

Arm C's own verification killed four real defects and narrowed a fifth, and it correctly killed two false ones. Its filter is therefore accurate about 29 percent of the time on the claims where the two arms disagree.

The reverse test is kinder to Arm C. Arm T raised 6 claims that the judge refuted, and Arm C's filter would have caught 2 of them. Arm C never raised the other 4 in any form.

### File coverage

| unit | files in the list | Arm T read | Arm C read |
|---|---|---|---|
| `A02-u1` (`1e3a282`) | 14 | 14 | 14 |
| `A02-u2` (`8989cbd`) | 57 | 57 | 57 |

Both arms read every file to its last line and neither reported a file that did not open. This metric is a tie.

### Cost

Every token count below comes from the agent harness, not from an estimate.

| stage | Arm T | Arm C |
|---|---|---|
| find | 324,180 tokens over 2 invocations | 479,934 tokens over 2 invocations |
| verify | the common judge, 380,858 tokens over 2 invocations for 34 claims | none; Arm C verifies inside the find stage |
| invocations for one segment | 4 | 2 |
| longest-pole wall clock | 646 s find + 733 s verify = 1,379 s | 1,061 s |

The judge is a shared cost, so its 380,858 tokens split between the arms only by estimate. Arm T supplied 23 of the 34 claims, so its prorated share is about 257,600 tokens and its whole pipeline costs about 581,800 tokens. That figure is the one estimate in this report, and it is marked as such.

On that basis Arm T costs about 1.21 times Arm C in total, and about 0.78 times Arm C for each defect that survives: about 34,200 tokens per defect against about 43,600. Arm T spends 21 percent more and finds 55 percent more.

Two cautions apply to the wall clock. The four find-stage agents ran at the same time on a 4-core container and the two judges ran as a pair, so the find stage carried more contention than the verify stage. The contention was symmetric across the arms within each stage, so the arm comparison holds, but the absolute seconds do not transfer to a run at the plan's concurrency cap of 2.

Arm C wins on total tokens, on wall clock, and on invocation count. Arm T wins on tokens for each defect found. The invocation count matters beyond this trial, because the plan states that only a 10-invocation proposal survives the concurrency cap across the whole programme.

### Claims about third-party behaviour

The dispatcher classified this from the claim text, so neither arm's prompt changed. Two files in the scope import a third-party runtime: `json-tree-node.tsx:3` and `tree-item-children.tsx:3` both import `motion/react`. No file in `A02` imports `@floating-ui/react`, pdfjs, or fetch. `json-tree` carries its own virtualization surface over `@tanstack/react-virtual`.

Four surviving claims rest on virtualization, and one refuted claim did: the two roving claims (`A02-U2-C02`, `C-U2-04`), the two seed claims (`A02-U2-C03`, `A02-U2-C04`), and the refuted spacer claim (`A02-U2-C01`).

**No claim in either arm was measured where its dependency is live.** Neither arm measured anything, because the plan bars it: "No sweep runs the package. Every claim comes from a read of the source." The trial did not lift that bar, so this metric records a method limit and not an arm difference.

The judge closed part of the gap that `A01` left open. It flagged the provable environment for every surviving claim without being asked twice, and it separated the three states that the `A01` correction identified. It ruled that jsdom settles the attribute and class assertions; that a real browser is needed for `K02`, `K05`, `K11`, `K18` and `K21`, because jsdom's `focus()` ignores `display: none` and jsdom implements no tab-order traversal; and that the end-to-end virtualization guarantee has no synchronous seam at all, so §10.3 bars a test from it in any project.

One gap remains open, and the dispatcher found it rather than either arm. **`motion/react` has no live context anywhere in this suite.** All three projects replace it: `src/__tests__/setup/module-mocks.ts` for jsdom, `src/__tests__/browser/setup/module-mocks.ts:12` for the browser instance, and `src/__tests__/browser/floating-ui/setup/module-mocks.ts` for the live-engine instance, which states its reason — "an in-flight animation must not leave an element mid-transition while focus is asserted". A claim that turns on the real exit hold of `motion/react` is therefore not provable today. The jsdom double renders `AnimatePresence` as `({ children }) => children`, so it holds no exiting child and models every animation as instant. No claim in `A02` needed that context, and the judge checked and said so. A later segment will need it, and `A01`'s `F6` is the shape.

## What the trial measured, and what it did not

The trial answers the plan's question about the find stage and the verify stage. It does not answer it about the record stage or the resolution stage, because `bug-recorder` and `bug-resolver` did not run.

Three limits bound the result.

The common judge removed Arm T's grouping step from the comparison, as the group section states. Arm T's architecture puts grouping in `bug-verifier`, and the verifier was shared, so the trial cannot say whether Arm T groups better or worse than Arm C.

The judge is itself a `bug-verifier`, which is one of the five agents under test. A verifier that judges a generalist's claims and a specialist's claims alike is the fairest instrument available here, and it never learned which claim came from where. It is not a neutral instrument, because the treatment supplied it.

One arm ran once. Two sweepers, two generalists and two judges are six samples over one segment, and a second run may move any figure in this report.

One artifact is worth recording. Arm C's unit-1 output cites a finding `C-U1-04` in its §10.3 note, and it numbered only three findings. The reference dangles. Nothing in the trial turns on it, and the judge never saw it, because the strip discards everything but the five fields.

## Which arm won which metric

| metric | winner |
|---|---|
| claims that survived the judge | **Arm T** — 17 against 11 |
| distinct defects found, of 21 | **Arm T** — 17 against 11 |
| defects the other arm missed | **Arm T** — 10 against 4 |
| defects with reach on a shipped surface | **Arm T** — it raised the only one in unit 2 |
| tokens for each surviving defect | **Arm T** — about 34,200 against about 43,600 |
| precision, survived ÷ raised | **Arm C** — 100% against 74% |
| claims refuted by the judge | **Arm C** — 0 against 6 |
| highest-severity row in the segment | **Arm C** — `C-U1-03` at medium-high |
| severity mix of the survivors | **Arm C** — 6 of 11 medium or above, against 7 of 17 |
| total tokens for one segment | **Arm C** — about 480,000 against about 582,000 |
| wall clock for one segment | **Arm C** — 1,061 s against 1,379 s |
| agent invocations for one segment | **Arm C** — 2 against 4 |
| file coverage | **tie** — both read 71 of 71 |
| third-party claims measured live | **tie at zero** — the plan bars a run, so neither measured one |
| root-cause groups | **not attributable** — the shared judge removed Arm T's grouping step |

Arm T wins 5, Arm C wins 8, 2 are ties, and 1 is unmeasurable.

That count is not the answer, because the metrics are not equal in weight. A sweep exists to find defects, and the treatment found 55 percent more of them and missed 4 where the control missed 10. The control's whole advantage comes from one step — it judges its own claims — and that step killed four real defects to catch two false ones. The specialists split find from judge for exactly that reason, and the head-to-head table is the evidence that the split earns its cost.

The control's cost advantage is real and it is not small. It runs one agent for each unit rather than two, at half the invocations and 77 percent of the wall clock, and it fits the concurrency cap with room that the treatment does not have.

The reader decides. The question that the numbers put is whether 55 percent more defects and a 26 percent false-claim rate beat 45 percent fewer defects and no false claims, at 1.21 times the tokens and 1.30 times the wall clock.

## Round 2 — what a second run changed

Round 1 rested on one run of each agent. Three tests then measured what that single run hid. Each
test was pre-registered, and the reading rules were fixed before any of the six agents ran.

**Test A — replicate.** The `bug-sweeper` prompt, unchanged, over both units a second time.

**Test B — amended sweeper.** The same agent with one added clause in the dispatcher prompt, which
asks it to raise a defect that is an absence. The agent file on disk did not change.

**Test C — independent judge.** A general-purpose agent judged the same shuffled, stripped union
that round 1 judged, under the same blindness. Round 1's judge is a `bug-verifier`, which is one of
the five agents under test, so this test attacks the trial's weakest joint.

### Recall of the 21 known defects, per run

| run | u1 (7 defects) | u2 (14 defects) | total |
|---|---|---|---|
| round 1, Arm T | 6 | 11 | **17 of 21** |
| Test A, same prompt | 3 | 11 | **14 of 21** |
| Test B, amended prompt | 4 | 9 | **13 of 21** |
| round 1, Arm C | 3 | 8 | **11 of 21** |

### Recall by defect

`1` means the run raised a claim the common judge confirmed against that defect. The `Arm C` column
is the round-1 control, for comparison.

| defect | what it is | R1 T | Test A | Test B | Arm C |
|---|---|---|---|---|---|
| `D01` | calendar roving seats no tab stop | 1 | 1 | 1 | 1 |
| `D02` | picker year grid marks the wrong year | 1 | 1 | 1 | 1 |
| `D04` | `KanbanColumnBody` falsy child | 1 | 1 | 1 | 1 |
| `D06` | `useListDrag` identity-map keys | 1 | 1 | 1 | 1 |
| `D09` | `CalendarRange` never re-anchors the view | 1 | 1 | 1 | 0 |
| `D12` | virtualized search seed never resets | 1 | 1 | 1 | 0 |
| `D16` | `ListItem` two tab stops | 1 | 1 | 1 | 0 |
| `D17` | `StatDelta` documents an absent `flat` | 1 | 1 | 1 | 0 |
| `D03` | virtualized JsonTree roving | 1 | 1 | 0 | 1 |
| `D05` | kanban card eats descendant keys | 1 | 1 | 0 | 1 |
| `D07` | Tree roving enters a hidden held item | 1 | 1 | 0 | 1 |
| `D14` | `userOpen` survives a data swap | 1 | 1 | 0 | 0 |
| `D08` | arrow cannot cross a month boundary | 1 | 0 | 1 | 0 |
| `D13` | `defaultExpandDepth` seeded once | 1 | 0 | 1 | 0 |
| `D20` | `rootKey=""` desyncs the path | 0 | 1 | 1 | 1 |
| `D21` | `stampTreePositions` counts wrappers | 0 | 1 | 1 | 1 |
| `D10` | month steppers coalesce | 1 | 0 | 0 | 0 |
| `D11` | bound field seeds from `defaultValue` | 1 | 0 | 0 | 0 |
| `D15` | `k.column.over` is an empty class | 1 | 0 | 0 | 0 |
| `D19` | `ensureFirstItemActive` cannot recover | 0 | 0 | 1 | 1 |
| `D18` | rendered month is write-only | 0 | 0 | 0 | 1 |

Eight defects came out of every sweeper run and three came out of exactly one. `D18` came out of no
sweeper run. A defect's own difficulty, not the agent, decides which band it sits in.

### Three findings, in order of weight

**Variance dominates the arm comparison.** Three runs of one agent over one file set reach 17, 14
and 13 of 21. The gap between the best and the worst run of the *same* agent is 4 defects. The gap
between Arm T and Arm C in round 1 is 6. The arm effect therefore sits only a little above the
noise, and round 1 measured it with one sample of each.

The two u2 runs make the point sharply. Both reach 11 of 14, and they reach different elevens:
round 1 found `D13` and `D15` and missed `D20` and `D21`, and the replicate did the reverse. Equal
recall, different sets.

**Repetition is the lever, and the prompt is not.** The amended prompt scored worst of the three
runs. It raised more claims and reached fewer known defects, so the absence clause is withdrawn as
a recommendation. What works instead is a second pass: two runs union to 19 or 20 of 21, and three
union to 20 of 21, against 13 to 17 for any single run.

**Arm C's unique advantage mostly dissolved.** Round 1 credited Arm C with 4 defects that Arm T
missed. A second and a third sweeper run found three of them — `D20` and `D21` twice each, and
`D19` once. Only `D18`, the write-only rendered month, resisted all three sweeper runs, and both
judges rank it the most severe row in the segment. Arm C's durable edge over the specialists is
therefore one defect in this segment, not four.

### What round 2 cost

| agent | u1 | u2 | total |
|---|---|---|---|
| Test A, replicate sweeper | 132,814 | 174,022 | 306,836 |
| Test B, amended sweeper | 109,823 | 184,534 | 294,357 |
| Test C, independent judge | 203,662 | 233,165 | 436,827 |

Round 2 spent 1,038,020 tokens over 6 invocations. Both rounds together spent 2,222,992 over 12.

### What the options cost for one segment

A sweep of both units costs about 308,000 tokens, measured over three runs (324,180 / 306,836 /
294,357). Round 1's verification cost 380,858 tokens for 34 claims, which is about 11,200 for each
claim. The two-sweep row scales that rate over the merged claim set and is therefore an estimate,
marked as such; every other figure is measured.

| strategy | recall of 21 | tokens for one segment | 26 remaining area segments |
|---|---|---|---|
| Arm C, one generalist pass | 11 (52%) | ~480,000 | ~12.5M |
| Arm T, one sweep plus verification | 13-17 (62-81%) | ~582,000 | ~15.1M |
| Arm T, two sweeps plus one verification | 19-20 (90-95%) | ~1,041,000 (estimate) | ~27.1M |

`A02` holds 5,841 lines against a mean segment of about 5,214, so these figures run slightly high
for the programme rather than low.

### The judge holds, with one caveat that is the dispatcher's fault

The independent judge agreed with the `bug-verifier` on survive-or-die for **34 of 34 claims**, and
on the exact verdict and severity for 32 of 34. The two differences are both on u1: it called `K08`
RESTATED where round 1 called it CONFIRMED, and it set `K09` to high where round 1 set medium-high.
It also found a reach for `K16` that round 1 recorded as NONE. Judge bias does not drive the
round-1 result.

The caveat is a design error, and it is mine. Round 1's report was committed to
`packages/ui/docs/audits/` before Test C ran, so both judges' prior-art search found it. Each one
disclosed the find and stated that it had already ruled. That cannot be verified from here, so the
agreement above is an upper bound rather than a clean replication. The three disagreements are the
evidence that some independence survived.

### What round 1's headline should now read

The round-1 counts are correct as measured. The sentence they support is narrower than the one the
[Executive summary](#executive-summary) gives. Arm T beat Arm C on recall in the one pairing that
ran, by a margin that a second run of Arm T alone could have produced. The precision result is
firmer, because it rests on a judged verdict for every claim rather than on one draw: Arm T's 6
refuted claims and Arm C's 0 are what they are.

Two limits apply to round 2 and not to round 1.

Only the round-1 claims carry a judged verdict. The Test A and Test B claims were scored for recall
against the known set, and every claim that matched no known defect went unjudged: 5 and 11 on u1,
and 5 and 8 on u2, so 29 in all. Their precision is unknown, and a second sweep therefore buys its
recall at an unmeasured cost in false claims.

Arm C ran once and was never replicated. Round 2 replicated the treatment three times and the
control zero times, so the control's 100 percent precision and its 11 of 21 recall are single draws
— the same weakness this section charges against round 1. A reader who still weighs one arm against
the other needs that test before the comparison carries more than round 1 gave it.

---

**See also:** [`2026-09-11-BUG-SWEEP-PLAN.md`](../plans/2026-09-11-BUG-SWEEP-PLAN.md) · [`2026-09-11-BUG-AUDIT.md`](2026-09-11-BUG-AUDIT.md) · [`2026-09-11-TEST-ARCHITECTURE.md`](2026-09-11-TEST-ARCHITECTURE.md) · [`CONVENTIONS.md` §12](../../../../CONVENTIONS.md) · [`../README.md`](../README.md).
