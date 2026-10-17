---
description: Read one area and propose a few small improvements, each with its evidence. Writes no file and starts no agent.
argument-hint: <area, such as packages/ui/src/components/tabs>
---

# Assess

Read one area and propose a few small improvements. Keep the cost low: read the files yourself, start no agent, and write no file. For a deep audit with blind verification, use [`bug-audit.md`](bug-audit.md).

## 1. Read

1.1 Take the area from `$ARGUMENTS`. When the area is vague or holds more than about 20 source files, ask one question to narrow it before you read.

1.2 Read the source files of the area, their TSDoc, and their tests. Read a file outside the area only to confirm one fact, such as the type of a prop or a shared hook.

1.3 Never read an audit, a plan, or a benchmark. They hold earlier judgments, not facts about the code.

## 2. Judge

2.1 A proposal is a defect or a stray that you can prove from the code. Quote the code as `path:line` plus its text. Quote the written rule that it breaks: a TSDoc sentence, a test, a type, an ARIA pattern, a section of [`CONVENTIONS.md`](../../CONVENTIONS.md), or a rule of [`STE.md`](../../STE.md). A preference with no written rule is not a proposal.

2.2 Rank by kind. A `bug` is a wrong result that a user meets. `correctness` is a broken contract that a user does not see. `polish` is a stray from the scale or the conventions. Put the bugs first.

2.3 Propose the smallest change that repairs each one. Do not propose a refactor, a new abstraction, or a change outside the area.

2.4 Give five proposals at most. When nothing in the area meets §2.1, say so. Never invent a proposal to fill the list.

## 3. Report

3.1 For each proposal, write one short paragraph: the kind, the `path:line` quote, the rule it breaks, what the user meets, and the smallest change.

3.2 After the proposals, name in one line each thing that you suspect but could not prove from the code.

3.3 Change nothing. The reader picks the proposals to fix, and each fix is a normal pull request with a test that fails first.

---

**See also:** [`bug-audit.md`](bug-audit.md) · [`CONVENTIONS.md`](../../CONVENTIONS.md) · [`STE.md`](../../STE.md).
