---
name: cadence
description: Enforce the codebase's vertical rhythm — blank lines between statements, before returns, around guard clauses — so new and modified code reads with the same breathing room as the code around it. Trigger whenever writing new code, editing existing code, or when asked to "check cadence", "review spacing", "add breathing room", "match the existing style", or "why does this read so densely?". Apply it as you write, not only on review.
argument-hint: "[file-or-pattern, or omit to apply while writing]"
---

# Cadence

Code in this repo breathes. A function body reads as a short sequence of paragraphs, not a wall of lines. The author separates each logical step with a blank line, so the eye lands on one thought at a time and a diff shows one idea per hunk. That vertical rhythm — the *cadence* — is the thing this skill protects.

Biome already owns the mechanical layout: tabs, single quotes, no semicolons, 100-column width, import ordering. Run `biome check .` and it will fix all of that. What Biome does **not** touch is the blank lines *between* statements, and that is precisely where this codebase has a strong, consistent voice. Cadence governs the rhythm Biome leaves alone. Don't hand-fix what the formatter handles; spend your attention on the breathing room it ignores.

## The core rule: one breath per logical step

Put a blank line between distinct logical steps. A declaration, the guard that checks it, and the work that follows are three steps, so they get three lines of their own with air between them. Lines that express a *single* thought stay packed together.

This is the whole skill in one example, drawn straight from `packages/auth/src/user.ts`:

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

— is what this skill exists to prevent. It parses fine and Biome is happy with it, but it reads against the grain of every neighbouring file.

## What earns a blank line

These are the recurring places the codebase inserts air. They aren't arbitrary; each one marks a seam between one idea and the next.

- **Before a `return`** that isn't the sole statement in its block. The return is the conclusion; let it stand apart from the work that produced it.
- **Around a guard clause or early return.** A `if (!x) return` is a checkpoint. Air on both sides makes it read as a gate, not as part of the surrounding flow.
- **Between a declaration and the block that consumes it.** `const next = { ...prev }` then a blank line then the `if` that mutates `next` — the setup and the use are two steps. See `useForm`'s `setValue` in `packages/shared/src/auth/use-form.ts`.
- **Between distinct logical steps** inside a function — validating, then assembling, then dispatching. Each phase is a paragraph.
- **Between top-level declarations** — a `type` and the function below it, one function and the next.
- **Between import groups.** Third-party imports sit apart from local ones (Biome's organize-imports maintains this; don't manually defeat it).

## What stays together

Breathing room is not a blank line between every physical line. That over-spacing is as wrong as a dense block — it shreds single thoughts into confetti. Keep these packed:

- **Members of a `type` or `interface`.** The fields of `User` are one declaration; no blanks between them.
- **Fields of an object or array literal**, and the lines of any single multi-line expression. They're one value, spelled across several lines.
- **A short run of declarations that form one setup move** — when several `const`s are genuinely a single "gather the inputs" step, leaving them adjacent is fine. Use judgement: the question is always "is this one thought or two?"

## Match the surrounding cadence

When you edit an existing file, read its rhythm first and mirror it. The goal is that a reviewer cannot tell which lines you added — your spacing should be indistinguishable from the author's. If a file groups its guards a certain way, follow that locally even if you'd have spaced it differently in a greenfield file. Consistency *within* a file beats your personal default.

For brand-new files, set the cadence from the examples above and the neighbours in the same package.

## Reviewing for cadence

When asked to review (a file, a pattern, or the current diff) rather than to write, read the target and report violations in terse `file:line` form, naming which seam is mis-spaced and the fix:

```
packages/foo/src/bar.ts:42 — no blank line before `return`; the result should stand apart from the loop above it
packages/foo/src/bar.ts:58 — guard clause packed against the declaration above; add a blank line so it reads as a checkpoint
packages/foo/src/baz.ts:11 — blank line inside a single object literal splits one value across a gap; remove it
```

Lead with the densest offenders. Don't flag anything Biome would fix on its own — point those at `biome check .` instead and keep the review focused on rhythm. If a file's existing cadence is internally consistent but differs from your default, that's not a violation; respect the local voice.

## Verify

After writing or fixing, run `biome check .` to confirm the mechanical layout is clean, then read the result back and ask the one question this skill cares about: does each statement get its breath, without single thoughts being torn apart? If yes, the cadence is right.
