---
name: cadence
description: Enforce the codebase's vertical rhythm — blank lines between statements, before returns, around guard clauses — so new and modified code reads with the same breathing room as the code around it. Trigger whenever writing new code, editing existing code, or when asked to "check cadence", "review spacing", "add breathing room", "match the existing style", or "why does this read so densely?". Apply it as you write, not only on review.
argument-hint: "[file-or-pattern, or omit to apply while writing]"
---

# Cadence

Code in this repo breathes. A function body reads as a short sequence of paragraphs, not a wall of lines: each logical step is separated by a blank line, so the eye lands on one thought at a time and a diff shows one idea per hunk. That vertical rhythm — the *cadence* — is what this skill protects.

Biome already owns the mechanical layout (tabs, single quotes, no semicolons, 100-column width, import ordering); `biome check .` fixes all of it. What Biome leaves alone is the blank lines *between* statements, and that is where this codebase has a strong, consistent voice. Don't hand-fix what the formatter handles — spend your attention on the breathing room it ignores.

## The core rule: one breath per logical step

Put a blank line between distinct logical steps; keep lines that express a *single* thought packed together. A declaration, the guard that checks it, and the work that follows are three steps, so they get air between them.

The whole skill in one example, from `packages/auth/src/user.ts`:

```ts
export async function getUser(): Promise<User | undefined> {
	try {
		const res = await bifrost('/auth/user')

		if (!res.ok) return undefined

		return (await res.json()) as User
	} catch {
		return undefined
	}
}
```

Three statements, three breaths. Collapsing them —

```ts
// Too dense — fights the house cadence
export async function getUser(): Promise<User | undefined> {
	try {
		const res = await bifrost('/auth/user')
		if (!res.ok) return undefined
		return (await res.json()) as User
	} catch {
		return undefined
	}
}
```

— is what this skill exists to prevent. Biome is happy with it, but it reads against the grain of every neighbouring file.

## What earns a blank line

The recurring seams where the codebase inserts air — each marks a boundary between one idea and the next.

- **Before a `return`** that isn't the sole statement in its block — let the conclusion stand apart from the work that produced it.
- **Around a guard clause or early return** — air on both sides of `if (!x) return` makes it read as a gate, not part of the surrounding flow.
- **Between a declaration and the block that consumes it** — `const next = { ...prev }`, blank line, then the `if` that mutates `next`. See `setValue` in `packages/shared/src/auth/use-form.ts`.
- **Between distinct logical steps** — validating, assembling, dispatching: each phase is a paragraph.
- **Between top-level declarations** — a `type` and the function below it, one function and the next.
- **Between import groups** — third-party apart from local (Biome's organize-imports maintains this; don't defeat it).

## What stays together

Breathing room is not a blank line between every physical line; over-spacing shreds a single thought into fragments and is as wrong as a dense block. Keep these packed:

- **Members of a `type` or `interface`** — the fields of `User` are one declaration.
- **Fields of an object or array literal**, and the lines of any single multi-line expression — one value spelled across several lines.
- **A short run of declarations that form one setup move** — several `const`s that are genuinely a single "gather the inputs" step can sit adjacent.

The question is always "is this one thought or two?"

## Match the surrounding cadence

When editing a file, read its rhythm first and mirror it — a reviewer should not be able to tell which lines you added. Consistency *within* a file beats your personal default, so follow the local spacing even where you'd have done it differently in greenfield code. For new files, set the cadence from the examples above and the neighbours in the same package.

## Reviewing for cadence

When asked to review (a file, a pattern, or the current diff) rather than write, report violations in terse `file:line` form, naming the mis-spaced seam and the fix:

```
packages/foo/src/bar.ts:42 — no blank line before `return`; the result should stand apart from the loop above it
packages/foo/src/bar.ts:58 — guard clause packed against the declaration above; add a blank line so it reads as a checkpoint
packages/foo/src/baz.ts:11 — blank line inside a single object literal splits one value across a gap; remove it
```

Lead with the densest offenders. Don't flag anything Biome would fix on its own — point those at `biome check .` instead and keep the review focused on rhythm. If a file's existing cadence is internally consistent but differs from your default, that's not a violation; respect the local voice.

## Verify

After writing or fixing, run `biome check .` for the mechanical layout, then read the result back and ask the one question this skill cares about: does each step get its breath, without single thoughts being torn apart?
