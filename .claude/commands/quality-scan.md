---
description: Scan every ui unit with fixed inputs, prove each finding, measure the scan, and write the result to the quality ledger
argument-hint: [full | changed | calibrate]
---

# Quality scan

You are the caller. The scan finds bugs, correctness findings, and polish findings in each `ui` unit, and it ranks the next Clean passes. It must find each real defect, and it must report no defect that is not real. Zero findings is the expected result for most units. A scan that returns nothing for a unit has done its work, when its lens checks (§3.2) show the reason.

The scan uses the bug agents of [`bug-audit.md`](bug-audit.md). That command governs each step that this file does not change.

## 1. Modes

1.1 `calibrate` runs the seeded set (§5) and the repeat pass (§6) over the calibration units. It writes no row of the ledger. Run it before the first `full` scan, and again after each change to a definition, a lens, or an agent.

1.2 `full` scans each unit of the ledger at one commit.

1.3 `changed` scans each unit whose shipped source changed after the scan commit of the ledger. It keeps the other rows, because their files did not change. Then it moves the scan commit to the new commit.

1.4 A `full` or `changed` scan writes the ledger only when the measures of §7 meet their targets. When a measure misses, report the miss to the reader, and fix its cause first (§7.3).

## 2. Fixed inputs

2.1 Pin one commit of `main` for the scan. Each read, each test, and each search uses that commit.

2.2 A scope is the full file list of one unit, from its directory: the shipped source, without the tests, the benchmarks, and the docs app. Never sample, and never split a unit across scopes, unless it has more than about 5,000 lines. Cut a larger unit by theme, as `bug-audit.md` §1.3 does.

2.3 The lenses of a unit are its Lenses cell in [`packages/ui/docs/LEDGER.md`](../../packages/ui/docs/LEDGER.md). A unit with no lenses gets them before its first scan, in a pull request that gives the reason for each lens. Do not add or drop a lens during a scan.

2.4 The severity levels and the kinds are in [`bug-verifier.md`](../agents/bug-verifier.md) §6. The lens rules are in [`bug-sweeper.md`](../agents/bug-sweeper.md) §6.

## 3. Sweep

3.1 Run one `bug-sweeper` for each scope, with the scope, its lenses, and the intent sources. Tell it that zero claims is a valid result. Do not tell it a count to reach, and do not show it a past finding of the unit.

3.2 Check each lens line of the return (`bug-sweeper.md` §4.5). Each lens of the unit has a claim or a `holds` line with a quoted guard. Run the sweep again when a lens has no line, or when a `holds` line quotes no code.

## 4. Verify and prove

4.1 Strip and verify each claim as `bug-audit.md` §3 does: a blind pass, then an overturn pass. Give the verifier the "Known, not chasing" cell of the unit in the digest.

4.2 A confirmed finding is open only when it is proved at the scan commit:

- A `bug` or a `correctness` finding needs a test that fails at the scan commit. Write the test in a scratch worktree at that commit. Run it, and keep its text and its failure output in the record row.

- A `polish` finding needs the quoted line beside the quoted rule that it breaks.

4.3 A finding that you cannot prove is not open. Write it under `Unproved` in the record, with the reason, and do not count it.

4.4 Run the merge pass (`bug-audit.md` §3.5) over all scopes.

## 5. Seeded set

5.1 The seeded set is `QUALITY_SEEDS` in [`packages/ui/scripts/quality-seeds.ts`](../../packages/ui/scripts/quality-seeds.ts). Each seed is a past fix of one unit. Its parent commit holds the defect that the fix repairs.

5.2 For each seed, sweep and verify the unit of the seed at the parent commit of the fix, with §3 and §4. Give the sweeper and the verifier no part of the seed: not the commit, the subject, the kind, or the diff.

5.3 A seed is found when a confirmed finding names a file that the fix changes, and the fix repairs the wrong result of that finding. Judge each match from the diff of the fix. Write the finding beside the seed in the record.

5.4 Recall is the count of seeds found, of the size of the set.

5.5 Each escape (§8) becomes a seed. Add it to the set in the pull request that records the escape.

## 6. Repeat pass

6.1 The calibration units are each 14th unit of the ledger, in the order of its rows, from the first row. Take the first 10.

6.2 Sweep, verify, and prove the calibration units a second time, at the same commit, with new agents. Give the second pass nothing from the first pass.

6.3 Agreement is the count of calibration units that get the same count of open bugs in both passes.

## 7. Measures

7.1 The measures and their targets:

| Measure | Target |
| --- | --- |
| Recall on the seeded set | 90% or more |
| Proof: open findings of the confirmed findings, in the units of the scan | Each unproved finding has a reason in the record |
| Agreement in the repeat pass | 9 of 10 units or more |
| Lens coverage: units with a line for each lens | Every unit |

7.2 Write the measures in the Scan section of the ledger, with the scan commit and the date.

7.3 A miss is a defect of the scan. A missed seed shows a lens or a definition that let a defect through. A disagreement shows a definition that two passes read differently. Change that lens, definition, or agent rule in its own pull request. Then run `calibrate` again.

## 8. Escapes

8.1 An escape is a defect that a later report, phone check, or fix finds in a unit whose row showed no open finding of that kind at that code.

8.2 Record each escape as a seed (§5.5), and note the lens or the definition that missed it in the pull request.

## 9. Record and ledger

9.1 Write the record at `packages/ui/docs/audits/{date}-QUALITY-SCAN-AUDIT.md`, as `bug-audit.md` §4 does. Add a `Kind` column to the Findings table, and the sections `Unproved`, `Seeded set`, and `Repeat pass`. Each open row keeps its proving test.

9.2 Set the Open cell of each scanned unit in the ledger from the open rows of the record. Write `none` for a unit with no open finding.

9.3 Commit the record and the ledger in one pull request. A Clean pass ([`bug-audit.md`](bug-audit.md) §8) then takes the units at the top of the "Next passes" table of `pnpm --filter ui quality:report`, and closes the rows of the record.

---

**See also:** [`bug-audit.md`](bug-audit.md) · [`bug-sweeper`](../agents/bug-sweeper.md) · [`bug-verifier`](../agents/bug-verifier.md) · [`LEDGER.md`](../../packages/ui/docs/LEDGER.md).
