# Cadence

> **The spacing and the shape of authored text.** One blank line separates each statement from the next, so that documents and code stay easy to scan and each diff stays clean. [`cadence-boundary.test.ts`](packages/ui/src/__tests__/boundary/cadence-boundary.test.ts) gates the rule documents at the repository root ([`CLAUDE.md`](CLAUDE.md) §3.6).

## What cadence means

A *statement* is one complete unit of authored text. It is a numbered clause in a rule document, a paragraph of prose, an item in a list, or a logical block of code.

Cadence governs the spacing and the shape of those statements, not the words. [`STE.md`](STE.md) governs the words and the grammar. Apply both.

This document obeys the cadence that it defines; read its spacing as the reference.

## Rules

1. **One blank line between statements.** Separate each statement from the next with exactly one blank line. Zero blank lines run two statements together, and two blank lines break the rhythm. In code, put the blank line between logical blocks.

2. **One idea per statement.** Give each statement one directive or one thought. Do not merge unrelated ideas, and do not split one idea across two statements.

3. **Contiguous numbering.** Number the clauses of a rule document `N.M`, in order and with no gap. Give a new clause the next number in its section.

4. **Terminal punctuation.** End each statement with sentence punctuation. A colon can end a statement that introduces a table or a list.

5. **House voice.** Write short, technical prose, and put the answer first ([`CLAUDE.md`](CLAUDE.md) §2).

6. **Joinery.** Join two related clauses with a semicolon only when the whole sentence stays inside the STE length limit. Put an aside in its own sentence or in parentheses, not between em-dashes. Use a list only for items that you can count ([`CLAUDE.md`](CLAUDE.md) §2.2).

7. **Consistent links.** Write a cross-reference with descriptive link text, a relative path, and a `§` section marker. Match the link form of the surrounding document.

8. **File hygiene.** End the file with one newline. Leave no trailing whitespace and no stacked blank lines.

## Gate

`cadence-boundary.test.ts` reads the rule documents at the repository root: `CLAUDE.md`, `CONVENTIONS.md`, `CADENCE.md`, `STE.md`, and `REFERENCE.md`. It checks the parts of rules 1, 3, 4, and 8 that a reader can measure. Rules 2, 5, 6, and 7 need judgment, so review holds them.

## Example

Drift: two statements with no blank line between them.

```md
1.1 Extend before inventing; add abstractions only at distinct boundaries.
1.2 Solve only the stated problem; surface adjacent issues.
```

Cadence: one blank line between the two statements.

```md
1.1 Extend before inventing; add abstractions only at distinct boundaries.

1.2 Solve only the stated problem; surface adjacent issues.
```

---

**See also:** [`CLAUDE.md` §2–3](CLAUDE.md) · [`STE.md`](STE.md) · [`CONVENTIONS.md` §12](CONVENTIONS.md) · [`REFERENCE.md`](REFERENCE.md).
