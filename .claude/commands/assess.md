---
description: Read one area and propose at most five small fixes for each pass, each with its proof. Changes no file in the repository.
argument-hint: <area, such as packages/ui/src/components/tabs> [focus, such as keyboard]
---

# Assess

Read one area of the code and propose a few small fixes, each with its proof. The command changes no file in the repository, and the reader picks the proposals to fix. For a deep audit with blind verification, use [`bug-audit.md`](bug-audit.md).

## 1. Terms

| Term | Meaning |
| --- | --- |
| Area | The files that the reader names in `$ARGUMENTS`. |
| Unit | One component, module, or hook, as [`bug-audit.md`](bug-audit.md) §1 defines it: its folder, its recipe files, and its docs page folder. |
| Source file | A file in the area that is not a test, a benchmark, or a fixture. The files of a docs page folder are source files. |
| Reach | Where a defect runs. `shipped`: a consumer root of [`bug-audit.md`](bug-audit.md) §3.4 other than the tests runs the trigger. `test-only`: only a test runs it. `none`: nothing runs it. For another package, the consumer roots are the apps and the packages that import it. |
| Pass | One read of 20 source files or fewer. A small area is one pass, and §2 cuts a large area into passes. |
| Focus | An optional limit on the defects that the command looks for, such as `keyboard`, `edge cases`, or `naming`. |
| Proposal | A defect that meets each condition of §4.1. |
| Suspect | A possible defect that does not meet each condition of §4.1. |
| Lead | A defect in a file outside the pass. A lead is not a proposal of the pass. |
| Reader | The person who runs the command and picks the proposals. |

## 2. Frame

2.1 Take the area from the first word of `$ARGUMENTS`: a path, or the name of a unit. Take the focus from the remaining words.

2.2 Find the path of a unit name with a search. When no path matches the area, ask the reader one question. Do not ask a question for another reason.

2.3 List the source files of the area, with their line counts (`wc -l`). When the area is a unit or the folder of one unit, list the whole unit (§1).

2.4 When the area holds 20 source files or fewer, it is one pass. Do the pass yourself with §3 to §5, and start no agent.

2.5 When the area holds more than 20 source files, cut it into passes. Put files that share one theme in the same pass, and put each source file in exactly one pass.

2.6 Tell the reader the list of passes before the first pass starts. Do not wait for an answer.

2.7 When the area holds more than one pass, run each pass in its own agent, one pass at a time. Run passes in parallel only when the reader tells you to.

2.8 Tell each agent to follow §3 to §5 of this file. Give it the pass number, its file list, the focus, and the declined items (§3.4).

2.9 Compare the list of files read (§5.7) in each report with the file list of the pass. Run the pass again when a file is not in the report.

2.10 Merge the reports of the passes with §6.

## 3. Read

3.1 Read each source file of the pass, with its TSDoc.

3.2 Find the tests of each source file with a search for the file name or the unit name in the test tree of the package, such as `packages/ui/src/__tests__`. Read the test names of each test file. Read in full only the test blocks that cover a defect that you judge.

3.3 Read the docs page folder of a unit as its source files. The page shows the unit as a consumer uses it, and a defect in the page is a defect in the area.

3.4 The reader can name items that they declined before. Do not propose a declined item again, and do not list it as a suspect.

3.5 Read a file outside the pass only to confirm one fact, such as the type of a prop or the result of a shared hook.

3.6 Do not read an audit record, a plan, or an earlier report of this command. They hold earlier judgments, not facts about the code.

3.7 Project memory can put an earlier finding into your context without a request. Do not use a recalled finding as proof. Prove each proposal from the code at the current commit.

## 4. Judge

4.1 A defect is a proposal only when it meets each of these conditions:

- You can quote the code that holds the defect, as `path:line` and the text of that line.
- You can quote the written rule that the code breaks. For `packages/ui`, the rule comes from an intent source of [`bug-audit.md`](bug-audit.md) §3.4, from a section of [`CONVENTIONS.md`](../../CONVENTIONS.md), or from a rule of [`STE.md`](../../STE.md). For another package, the rule is a TSDoc sentence, a test, a type, an ARIA pattern, or a section of a document of that package. A `design` proposal meets §4.3 instead.
- A small change inside the area repairs it. A refactor or a new abstraction is not a small change.
- The defect is inside the focus, when the reader gives a focus.

4.2 A preference with no written rule is not a proposal and not a suspect. Drop it. A pattern that meets §4.3 is not a preference. The polish list of [`bug-verifier.md`](../agents/bug-verifier.md) §6.3 is a written rule, and dead surface is on it.

4.3 A `design` proposal replaces working code with a clearly better pattern, and the current pattern is its defect. Its rule is [`CLAUDE.md`](../../CLAUDE.md) §1.5. Show each of these:

- The cost of the current pattern, such as an effect, a listener, a ref, a state, or a wrapper that the change removes.
- The replacement and its prior art: a platform feature, a React or library API, or the same pattern elsewhere in the repository.
- A test or a browser check that shows that the behavior does not change.

4.4 A better pattern that needs a refactor is not a proposal. Write it under "Larger patterns", with its cost and its gain.

4.5 Give each proposal the first kind in this table that applies to it:

| Kind | Meaning |
| --- | --- |
| `bug` | A user meets a wrong result: on the screen, with a keyboard or a pointer, through assistive technology, or in the data. |
| `correctness` | The code breaks a written contract, but no user meets a wrong result. |
| `design` | The code works and breaks no rule, but a clearly better pattern does the same work (§4.3). |
| `polish` | The code strays from the scale, from a section of `CONVENTIONS.md`, from a rule of `STE.md`, or from the polish list of `bug-verifier.md` §6.3. |

4.6 A defect with reach `test-only` or `none` is `correctness` at most; `bug` needs reach `shipped`. Find the reach with one search of the consumer roots for each defect.

4.7 Give each proposal its proof: `read` when the code alone proves it, `test` when a test that you ran shows it, or `browser` when you saw it in a browser.

4.8 You can run a scoped test or a browser check to prove a `bug` or a `design` proposal. Remove each scratch file before you report.

4.9 For a browser check of a `packages/ui` unit, run `pnpm dev` in `packages/ui`. The docs app serves at `http://localhost:3456`. A component page has the path `/{folder}`, such as `/accordion`, and another page has its folder path, such as `/modules/grid`. The dev server does not prerender: the browser renders each page, so the dev server shows no server HTML. To check the first paint or the hydration of a page, build the docs with `pnpm docs:build`, and serve the build with `pnpm docs:preview` at the same address.

4.10 Before you rank the proposals, challenge both sides ([`CLAUDE.md`](../../CLAUDE.md) §1.5):

1. For each proposal, make the strongest case for the current code: a comment, a test, a ruling, an edge case, or the cost of the fix. When that case wins, move the proposal to "Kept".
2. For each source file with no proposal, ask whether a clearly better pattern does the same work. Propose it when it meets §4.3.
3. State each proposal that survives as a fact. Do not write "consider" or "could".

4.11 Rank the proposals. Put each `bug` first, then each `correctness`, then each `design`, then each `polish`. In one kind, order by reach (`shipped`, then `test-only`, then `none`), and then put first the defect that more users meet.

4.12 Propose five defects or fewer for each pass. When more than five meet §4.1, propose the five that rank highest, and list each other one under "Also proved".

4.13 When no defect meets §4.1, say so. Never invent a proposal to fill the list.

## 5. Report

5.1 Write the report of a pass in this order: the proposals, "Also proved", "Kept", "Larger patterns", "Suspects", "Leads", and "Files read".

5.2 Write each proposal in this form:

```md
### {n}. {kind}: {title of six words or fewer}

Code: `{path}:{line}` `{text of the line}`
Rule: {source of the rule}: "{text of the rule}"
Effect: {the wrong result that the user meets, the contract and what the code does, or the cost of the current pattern}
Fix: {the smallest change}
Against: {the strongest case for the current code, and why the proposal wins}
Reach: {shipped, test-only, or none}
Proof: {read, test, or browser}
```

5.3 Write each line of "Also proved" as the kind, the `path:line`, and the defect.

5.4 Write each line of "Kept" as the `path:line`, the change, and the reason that the current code wins.

5.5 Write each suspect in one line: the possible defect, its `path:line`, and the fact that proves or refutes it.

5.6 Write each lead in one line: the `path:line` and the defect.

5.7 List each file that you read under "Files read".

5.8 Change no file in the repository.

## 6. Merge

6.1 This section applies only to an area of more than one pass. Give the reader one merged report in the form of §5.

6.2 Number the proposals across the passes by kind: `B1` and up for each `bug`, `C1` and up for each `correctness`, `D1` and up for each `design`, and `P1` and up for each `polish`.

6.3 Join two proposals that quote the same line, or that share a cause, into one proposal.

6.4 Judge each lead against §4.1 when its file is in the area. Each other lead stays a lead.

6.5 Open the quoted line of each `bug`, and make sure that the code agrees with the proposal. When it does not agree, make the proposal a suspect.

6.6 The limit of five proposals applies to each pass, not to the merged report. Keep each line of "Also proved" under "Also proved".

## 7. Recommend

7.1 End the report with your recommendation: the proposals to fix, in order. Put fixes that change the same file in the same pull request.

7.2 The reader picks the proposals to fix. Each fix is a normal pull request. Each `bug` fix comes with a test that fails before the fix.

---

**See also:** [`bug-audit.md`](bug-audit.md) · [`CONVENTIONS.md`](../../CONVENTIONS.md) · [`STE.md`](../../STE.md).
