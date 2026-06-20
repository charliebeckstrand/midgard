# Cadence

> **The project's writing-and-structure rhythm.** Cadence is the uniform spacing and shape of every authored statement — its cornerstone a single blank line between statements — so structured documents and code stay scannable, diff-clean, and consistent. Verify cadence before committing ([`CLAUDE.md`](CLAUDE.md) §3.6).

## What cadence means

A *statement* is one self-contained unit of authored text: a numbered clause in a structured document ([`CLAUDE.md`](CLAUDE.md), [`CONVENTIONS.md`](CONVENTIONS.md)), a paragraph of prose, an item in a list, or a logical block of code.

Cadence governs how those statements are spaced and shaped relative to one another — rhythm and consistency, not wording. The content is the author's; the cadence is fixed.

This document obeys the cadence it defines; read its own spacing as the reference.

## Rules

1. **One blank line between statements.** Separate every statement from the next with exactly one blank line — never zero, which runs statements together, and never two or more, which fragments the rhythm. In prose and structured documents this is a blank line between paragraphs or numbered clauses; in code it is a blank line between logical blocks.

2. **One idea per statement.** Each statement carries a single directive or thought. Join tightly coupled clauses with a semicolon inside the statement; never merge unrelated ideas, nor split one idea across statements.

3. **Contiguous numbering.** Structured statements use hierarchical `N.M` numbering, in order with no gaps; a new statement appends the next index within its section.

4. **Terminal punctuation.** End every statement with sentence punctuation.

5. **House voice.** Write terse, technical, imperative prose, answer-first and without filler — per [`CLAUDE.md`](CLAUDE.md) §2.

6. **Deliberate joinery.** Use semicolons to join related independent clauses and em-dashes (`—`) to set off asides; reserve lists for genuinely enumerable items ([`CLAUDE.md`](CLAUDE.md) §2.2).

7. **Consistent links.** Cross-reference with descriptive link text, relative paths, and `§` markers for sections, matching the surrounding document's link form.

8. **File hygiene.** End the file with exactly one trailing newline; leave no trailing whitespace and no stacked blank lines.

## Example

Drift — statements packed together, no separating blank line:

```md
1.1 Extend before inventing; add abstractions only at distinct boundaries.
1.2 Solve only the stated problem; surface adjacent issues.
```

Cadence — exactly one blank line between each statement:

```md
1.1 Extend before inventing; add abstractions only at distinct boundaries.

1.2 Solve only the stated problem; surface adjacent issues.
```

---

**See also:** [`CLAUDE.md` §2–3](CLAUDE.md) · [`CONVENTIONS.md` §12](CONVENTIONS.md) · [`REFERENCE.md`](REFERENCE.md).
