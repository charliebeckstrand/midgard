---
description: Run a bug audit over one area with the bug-sweeper, bug-verifier, and bug-resolver agents, and write its record
argument-hint: <area, such as packages/ui/src/components> [lens]
---

# Bug audit

You are the caller. The three bug agents read and judge. You cut the scopes, move the text between the passes, write the record, and route the leads. An agent never chooses its own scope, never writes a file, and never sees what its pass must not see.

## 1. Frame

1.1 Take the area, and the lens when one is given, from `$ARGUMENTS`. When the area is vague, ask one question before any agent runs.

1.2 List each source file in the area with its line count. Leave out the tests, the benchmarks, and the demo tree, because the verifier reads the demos as a consumer root.

1.3 Cut the list into scopes of about 5,000 lines, grouped by theme. Give each scope an id from `B01`. Each file goes in exactly one scope, and the scope lists sum to the whole area.

1.4 For a lens audit, which hunts one defect class across a wide area, find the candidate sites with a search. Then cut the candidates to the size of one scope (`bug-sweeper.md` §2.2).

1.5 Name the intent sources and the consumer roots of the owning package. For `packages/ui`, `bug-sweeper.md` §1.4 and `bug-verifier.md` §2.2 and §2.3 name them. For another package, name them yourself and write them in the record.

1.6 Build the prior-art digest once: the open rows, the ruled-out entries, and the surfaced-not-fixed entries of each open audit that covers the area. Each verifier call on one scope gets the same text.

## 2. Sweep

2.1 Run one `bug-sweeper` for each scope, in parallel. Give it the scope id, the file list with line counts, and the intent sources. Give it no prior record and no claim from another scope.

2.2 Compare each coverage line with the list that you sent. Run the sweep of a scope again when a file did not open.

2.3 Keep each claim with its `evidence` block, because the overturn pass needs it.

2.4 Route each lead to the scope that owns its file, as a path only (`bug-sweeper.md` §2.4). A lead outside the area goes in the record under `Surfaced, not judged`.

## 3. Verify

3.1 Strip the `evidence` block from each claim with code, not with an instruction. The blind pass is blind only when the evidence never reaches the verifier.

3.2 Run one `bug-verifier` for each scope. Give it the stripped claims, the scope id, the file list, the intent sources, the consumer roots, and the digest.

3.3 Issue each UNLOCATED claim again, with its evidence attached.

3.4 Run the overturn pass for each scope, with the finished sheet and the sweep evidence (`bug-verifier.md` §3.17).

3.5 Run one merge pass across all the sheets (`bug-verifier.md` §3.15). It joins the groups that share a file and a symbol, orders the steps, and computes the file set of each step again. It changes no verdict and no severity.

## 4. Record

4.1 Write the record at `packages/ui/docs/audits/{date}-BUG-AUDIT.md` ([`CONVENTIONS.md`](../../CONVENTIONS.md) §12.3). For an area outside `ui`, ask the reader where the record goes.

4.2 The record has these sections, in this order:

- The title, `# Bug audit — {date}`, and a summary: the area, the count of scopes, files, lines, and claims, and the count of findings that stay open.

- `## Scope`: what the area holds, what it leaves out and why, and a table with the columns `Scope`, `Theme`, `Files`, `Lines`, and `Claims`.

- `## Method`: the passes, the coverage result, and a table with the columns `Pass`, `In`, and `Out`.

- `## Findings`: the counts by severity and by reach, the legend of the `Status` cell, and a table with the columns `Row`, `File`, `Symbol`, `Verdict`, `Severity`, `Reach`, `Group`, and `Status`.

- `## Mechanisms`: one entry for each row, with the parts `File`, `Mechanism`, `Trigger`, `Documented intent`, `Reach`, `Severity`, and `Prior art`.

- `## Root-cause groups`: each group id, its cause in one sentence, and its members.

- `## Recommended resolution`: each step id, with the parts `Change`, `Rows closed`, `Files`, `Order`, `Depends on`, `Gate`, and `Test seam`.

- `## Open questions`: each question, with its axes, what each answer changes, and the answer once the reader settles it.

- `## Ruled out`: each refuted claim and each dropped part, with the quoted guard that ruled it out.

- `## Surfaced, not judged`: each lead, with its source: a sweeper, a verifier, the caller, or the reader.

4.3 Severity is `high`, `medium`, or `low`. Reach is `shipped`, `test-only`, or `none`. The `Status` cell starts at `◯ OPEN`, moves to `◐ FIXED` on a branch, and ends at `✅ RESOLVED ([#NNN](https://github.com/charliebeckstrand/midgard/pull/NNN))`.

4.4 Copy each table cell from the mechanism entry of its row. A cell typed by hand drifts: the 2026-09-13 audit rated 15 cells above their own paragraphs.

4.5 The mechanism entry is the specification for `bug-resolver` (`bug-resolver.md` §1.3). Quote each cited line as `path:line` plus its text, because the numbers drift as the steps merge.

4.6 The record keeps its authored voice. STE and the cadence do not govern it ([`STE.md`](../../STE.md)).

## 5. Settle

5.1 Put the open questions to the reader, with their axes. Do not answer one yourself.

5.2 Run a settle pass with the answers of the reader, word for word (`bug-verifier.md` §3.16). Write each answer under its question, and replace each step that the pass derives again.

## 6. Resolve

6.1 Give `bug-resolver` one step for each run: the step id, the row ids, the scope id, the file set, the mechanism entries of the rows, the step entry, and the settled questions. Never pass a step whose gate question is open.

6.2 Run in sequence two steps whose file sets share a file, in the merge order. Steps with disjoint file sets can run in parallel.

6.3 When the reader orders a pull request for a step, set `✅ RESOLVED` on each row it closes, on the branch of that step. The squash then carries the cell to `main` (`bug-resolver.md` §2.3).

6.4 Route each lead from a resolver return. An adjacent defect goes back to a sweep, and a seam across components becomes its own probe.

6.5 When each row is resolved, ask the reader before you delete the record ([`CONVENTIONS.md`](../../CONVENTIONS.md) §12.4, [`CLAUDE.md`](../../CLAUDE.md) §1.3).

## 7. Prohibitions

7.1 Never let an agent derive or widen a file list.

7.2 Never let the sweep evidence reach a blind pass.

7.3 Never hand a sweeper a prior record, and never hand a verifier a benchmark. The digest and the overturn pass are the only routes from a prior audit to an agent.

7.4 Never write a verdict, a severity, or a reach that an agent did not return. The caller writes the record; the agents judge.

---

**See also:** [`bug-sweeper`](../agents/bug-sweeper.md) · [`bug-verifier`](../agents/bug-verifier.md) · [`bug-resolver`](../agents/bug-resolver.md) · [`CONVENTIONS.md` §12](../../CONVENTIONS.md).
