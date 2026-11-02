---
description: Run a bug audit over one area with the bug-sweeper and bug-verifier agents, write its record, and hand each fix step to its own session
argument-hint: <area, such as packages/ui/src/components/tabs> [unit | class <lens>]
---

# Bug audit

You are the caller. The two bug agents read and judge: `bug-sweeper` raises claims, and `bug-verifier` judges them. You plan the audit, cut the scopes, move the data between the passes with code, write the record, and hand each fix step to its own session. The reader is the human who approves the cost, settles the questions, and orders the fixes.

## 1. Terms

| Term | Meaning |
| --- | --- |
| Area | The files that the reader names in `$ARGUMENTS`. |
| Scope | A part of the area that one sweeper reads in full. It has an id (`B01`, `B02`, and so on) and an explicit file list with a line count for each file. |
| Unit | One component, module, or hook, with all of its source files. |
| Claim | A defect that a sweeper names: a file, a symbol, a trigger, and a wrong result. |
| Evidence | The part of a claim that holds the line numbers, the trace, the suspected severity, and the fix idea. The verifier never sees it in a blind pass. |
| Lead | A defect that an agent saw in a file outside its scope, or did not judge. A lead is not a finding. |
| Sheet | The return of one verifier call. |
| Digest | The prior art that each verifier call gets: earlier rulings on the area. |
| Record | The Markdown file that holds the findings. It lives on its own branch and never merges. |
| Step | One fix in the record. It closes one or more rows. |
| Question | A decision that the reader makes before a step can run. |

## 2. Modes

Take the mode from `$ARGUMENTS`. When `$ARGUMENTS` names no mode, the mode is `area`.

| Mode | Input | Scopes | Lenses | Floor |
| --- | --- | --- | --- | --- |
| `area` | A directory or a file set. | About 5,000 lines each, grouped by theme. | The sweeper uses the lens table of `bug-sweeper.md` §6 as a checklist. It writes no lens lines. | None. |
| `unit` | One unit, or a family of units that share a mechanism. | The full file list of one unit. | The caller names each lens that applies to the unit (`bug-sweeper.md` §6.3). The sweeper writes one lens line for each lens, and one contract line for each contract sentence. | `medium` (`bug-verifier.md` §6.2). |
| `class` | One defect class over a wide area: a lens id from `bug-sweeper.md` §6.2, or a rule that the reader writes. | Candidate sites from a search, cut to about 5,000 lines each. | The one lens of the class. | None. |

## 3. Plan

Do every step of this section before the first agent runs.

3.1 When the area is vague, ask the reader one question.

3.2 List each source file of the area with its line count (`wc -l`). Leave out the tests, the benchmarks, and the demo tree (`packages/ui/src/docs/pages`), because the verifier reads the demos as a consumer root. When the area is the demo tree, keep it.

3.3 Cut the list into scopes by the mode (§2). Each file goes in exactly one scope, and the scope lists sum to the whole list of §3.2. Check both with code.

3.4 Name the intent sources and the consumer roots. Give the same lists to each agent. For `packages/ui` they are:

- Intent sources: `CONVENTIONS.md` §3, §4, §5, §7, §10.7, §10.8, §11.3, and §12.1; `packages/ui/REFERENCE.md` §2; the ARIA Authoring Practices pattern of each role; and the TSDoc, the comments, and the tests of the code.

- Consumer roots: `apps/admin`, `apps/places`, `apps/picks`, `packages/ui/src/docs/pages`, `packages/ui/src/modules`, `packages/ui/src/layouts`, and the shipped defaults of each component. A shipped default is the props and the wiring that a component applies when a consumer passes none. `packages/ui/src/__tests__` is a weaker root: it shows that a shape can be built, not that it ships.

For another package, write the two lists yourself, and put them in the record.

3.5 Build the digest once. It holds the open rows, the ruled-out entries, and the surfaced entries of each open record that covers the area, and each ruling of the reader that makes a behavior deliberate. In a `unit` audit, it also holds each finding of the unit that the reader declined before. When no prior art exists, the digest is the word `none`.

3.6 Make a work folder in the scratchpad, such as `$WORK`. Each agent writes its return there as JSON, at a path that you give. A script, not a hand copy, moves the data between the passes.

3.7 Give the reader the cost plan: the count of scopes, the count of agent calls in each pass (§4 to §5), and the total. The agents run on Opus. To cut the cost, one verifier call can judge two scopes. Wait for the reader to approve the plan.

## 4. Sweep

4.1 Run one `bug-sweeper` call for each scope. Give it exactly these inputs:

- The mode, the scope id, and the file list with the line counts.

- The intent sources.

- In a `unit` audit, the lens ids. In a `class` audit, the lens and the candidate sites.

- The output path, such as `$WORK/sweep-B01.json`.

Give it no digest, no record, and no claim or sheet from another scope.

4.2 Run at most 20 agents at a time, and queue the rest.

4.3 When an agent stops before it returns, such as at a usage limit, resume that agent with `SendMessage`. Do not start a new call: a new call reads the whole scope again.

4.4 Check the coverage of each scope with code: `coverage.listed` and `coverage.read` both equal the count of files that you sent, and `coverage.unopened` is empty. When a check fails, run the sweep of that scope again.

4.5 Put each lead in the record under `Surfaced, not judged`. When the reader orders a second sweep of a scope, give that sweep the path of each lead in the scope, and not the defect that the lead names (`bug-sweeper.md` §2.4).

## 5. Verify

5.1 Strip the evidence with code, not with an instruction. The blind pass is blind only when the evidence never reaches the verifier:

```sh
jq '{scope, claims: [.claims[] | del(.evidence)]}' "$WORK/sweep-B01.json" > "$WORK/stripped-B01.json"
```

Then check that no field outside the evidence holds a line reference. This command must print nothing:

```sh
jq -r '.claims[] | del(.evidence) | tostring' "$WORK/sweep-B01.json" | grep -E '\.[a-z]+:[0-9]|\blines? [0-9]'
```

When it prints a claim, move the line reference of that claim into its evidence, and strip again.

5.2 Run one `bug-verifier` judge call for each scope, or for each pair of scopes (§3.7). Give it the stripped claims, the scope ids, the file lists, the intent sources, the consumer roots, the digest, and the output path.

5.3 Give each `UNLOCATED` claim to a new judge call, alone, with its evidence attached. Write in the record that the claim was not judged blind.

5.4 Run the overturn call (`bug-verifier.md` §3.4) on each confirmed finding at `high` or `medium`, with its sweep evidence attached. In a `unit` audit, include each confirmed finding. When the findings are more than about 40, split the call by scope.

5.5 Run one merge call (`bug-verifier.md` §3.5) over all the sheets, after the overturn.

## 6. Record

6.1 Write the record at `packages/ui/docs/audits/{date}-{TOPIC}-BUG-AUDIT.md`, where `{TOPIC}` names the area in capitals, such as `GRID` ([`CONVENTIONS.md`](../../CONVENTIONS.md) §12.3). For an area outside `packages/ui`, ask the reader for the folder. Commit the record on a branch of its own and push it. Open no pull request: the record never merges, and each fix pull request leaves it alone.

6.2 Build the record with a script from the JSON sheets. Copy each table cell from the field of its row, because a cell typed by hand drifts. The 2026-09-13 audit rated 15 cells above their own paragraphs.

6.3 The record has these sections, in this order:

- The title, `# Bug audit: {area}, {date}`, and a summary: the mode, the area, the count of scopes, files, lines, and claims, and the count of findings that stay open.

- `## Scope`: what the area holds, what it leaves out and why, and a table with the columns `Scope`, `Theme`, `Files`, `Lines`, and `Claims`.

- `## Method`: the intent sources, the consumer roots, the digest source, each pass, the coverage result, each deviation from this command, and a table with the columns `Pass`, `In`, and `Out`.

- `## Findings`: the counts by severity, by reach, and by kind, the legend of the `Status` cell, and a table with the columns `Row`, `File`, `Symbol`, `Verdict`, `Severity`, `Reach`, `Kind`, `Group`, and `Status`. The row id is the claim id.

- `## Mechanisms`: one entry for each row, with the parts `File`, `Mechanism`, `Trigger`, `Documented intent`, `Reach`, `Severity`, and `Prior art`. Quote each cited line as `path:line` plus its text, because the line numbers drift as the steps merge. The entry is the specification of the fix.

- `## Root-cause groups`: each group id, its cause in one sentence, and its members.

- `## Recommended resolution`: each step id, with the parts `Change`, `Rows closed`, `Files`, `Order`, `Depends on`, `Gate`, and `Test seam`.

- `## Open questions`: each question, with its axes, what each answer changes, the recommended answer with its reason, and the answer of the reader once it is settled.

- `## Ruled out`: each refuted claim and each part that a `NARROWED` verdict drops, with the quoted guard.

- `## Surfaced, not judged`: each lead, with its source: a sweeper, a verifier, the caller, a fix session, or the reader.

6.4 The values are fixed:

- Severity: `high`, `medium`, or `low` (`bug-verifier.md` §6.1).

- Reach: `shipped`, `test-only`, or `none`.

- Kind: `bug`, `correctness`, or `polish` (`bug-verifier.md` §6.3).

- Status: `◯ OPEN`; `✅ RESOLVED ([#NNN](https://github.com/charliebeckstrand/midgard/pull/NNN))` after the fix pull request merges; or `✖ DROPPED` with the reason of the reader.

6.5 The record keeps its authored voice. STE and the cadence do not govern it ([`STE.md`](../../STE.md)). Write no em dash in it.

## 7. Settle

7.1 Put the open questions to the reader, each with its axes and its recommended answer. Do not settle a question yourself. When the reader says to proceed as recommended, each question settles on its recommended answer.

7.2 Write each answer under its question, in the words of the reader, and commit it on the record branch.

7.3 When an answer changes a step, run a settle call (`bug-verifier.md` §3.6) with the answers word for word, and replace each step that it derives again. When no answer changes a step, run no settle call.

## 8. Fix

8.1 Give each step that the reader orders to its own session: one step, one session, one pull request. Never hand over a step whose gate question is open.

8.2 The brief of a fix session holds the step id, the row ids, the mechanism entry of each row, the step entry, the settled questions, and the name of the record branch. It tells the session to do these things:

- Find each cited line again from its symbol on the current `origin/main`. When the defect is gone, return with no change and say which change removed it.

- Check the open pull requests. When one touches a file of the step, return with no change and name it.

- Write a test that fails on its assertion before the change, not on an import or a crash ([`CONVENTIONS.md`](../../CONVENTIONS.md) §10.5). When §10.3 bars a test of the machinery under the defect, test the seam that the step names. When no seam exists, give the reason in the pull request.

- Make the change that the step states, and no more. Treat the mechanism entry and the settled questions as fixed. When the fix shows that the entry is wrong, return with no change and say what is wrong.

- Leave the record alone. Return each defect seen on the way as a lead.

8.3 Run in sequence two steps whose file sets share a file, in the merge order. Steps with disjoint file sets can run in parallel, but push one branch at a time: two pre-push gates at once run out of memory.

8.4 When a fix pull request merges, set `✅ RESOLVED` on each row that it closes, on the record branch. When the reader declines a row, set `✖ DROPPED` with the reason.

8.5 When each row is resolved or dropped, ask the reader to delete the record branch ([`CONVENTIONS.md`](../../CONVENTIONS.md) §12.4, [`CLAUDE.md`](../../CLAUDE.md) §1.3).

## 9. Prohibitions

9.1 Never let an agent derive or widen a file list.

9.2 Never let the sweep evidence reach a judge call.

9.3 Never give a sweeper the digest or a record. The digest and the overturn call are the only routes from a prior ruling to an agent.

9.4 Never write a verdict, a severity, a reach, or a kind that an agent did not return. The agents judge; the caller writes the record.

9.5 Never start an agent before the reader approves the cost plan (§3.7).

---

**See also:** [`bug-sweeper`](../agents/bug-sweeper.md) · [`bug-verifier`](../agents/bug-verifier.md) · [`CONVENTIONS.md` §10, §12](../../CONVENTIONS.md).
