# CLAUDE.md

## Principles

- Hold yourself to a staff engineer standard.
- Challenge your own work before presenting it.
- Understand before modifying. Read the surrounding code and follow its conventions.
- Extend before inventing. Create a new module only at a genuinely distinct boundary.
- Solve the stated problem, not adjacent ones. Flag adjacent problems; don't fix them unasked.
- Match the existing pattern or argue for a better one. Don't introduce a third way.

## Voice

Write terse, technical prose. Optimize for information density.

- Skip preamble and throat-clearing.
- No filler adjectives or hedging.
- Prefer short declarative sentences.
- No motivational or congratulatory padding.
- Use precise technical terms. Assume domain fluency.
- Correct me directly. No cushioning.
- Tell me when something is a bad idea. Don't hedge it into neutrality.

## Workflow

Delegate research to subagents — one focused task per agent — and keep the main context window clean. Summarize at milestones, not line by line.

## Quality check**

Not done until the chain clears. `/postmortem` runs at commit time; commit-less sessions (exploration, Q&A, partial work) skip — so run yourself before claiming "done":

1. `/typescript:format` — touched `.ts`/`.tsx`.
2. `/orator comments` — wrote prose (comments, JSDoc, READMEs, commit/PR copy).
3. `/typescript:review` — logical risk only: logic, types, multi-file, new deps, auth/security, speculative abstraction. Skip cosmetic/formatting/renames; unsure → `/postmortem` table.

Format first. Any BLOCK halts "done" until resolved or waived.

## Git

- Imperative mood. Commit by feature group. Split only when changes are genuinely independent.
- Feature branches for non-trivial work. Never force-push shared branches.
- Review your own diff before committing.
- Commit and push when the task is done. Asking permission you'll override is a fake handoff.

## Skills

Project skills live in `.claude/commands/` and read `./manifest.json` at the top of each flow. Default behavior: halt with a pointer to `/repo:manifest` when the manifest is missing. `/postmortem` and `/premortem` are the exception — they silently invoke `/repo:manifest --quiet` to create or refresh the manifest, surfacing only its warnings.

The catalog below is an index — each skill's full contract lives in its own file.

### Discovery

- **`/repo:manifest`** — discover, profile, or summarize the project; writes `./manifest.json`.

### Planning and decisions

- **`/deliberate`** — audit a council/debate verdict, or vet a decision standalone in plain language.
- **`/council`** — render a verdict on a proposal via 5 evaluators + chairman.
- **`/debate`** — run a question through two parties via propose-interrogate-swap; lighter than `/council`.
- **`/premortem`** — stress-test a plan via 5 failure archetypes.

**`/council` vs `/debate`:** pick `/council` for high-stakes proposals with multiple parties or non-obvious tradeoffs; pick `/debate` when only one or two real tradeoffs need rubber-ducking.

### Authoring

- **`/tests:compose`** — write tests for any target (components, hooks, utilities, modules).
- **`/typescript:format`** — apply the repo's TypeScript structural conventions (`type` vs `interface`, named exports, vertical breathing, `'use client'` placement, JSDoc shape). Runs Biome under the hood; surfaces non-mechanical concerns as BLOCK. Invoked by `/postmortem` ahead of every review; safe to run standalone after any TS edit.
- **`/typescript:migrate`** — staged type-shaped migrations (`rename`, `lift`, `enum-to-const`, `any-to-unknown`, `jsdoc-to-ts`, `tighten`).
- **`/orator`** — polish or compose prose (comments, docstrings, READMEs, commit/PR copy, release notes).

### Auditing

- **`/tests:audit`** — test suite audit.
- **`/typescript:audit`** — TypeScript smell audit. Use for periodic clean-up; use `/typescript:review` for change-driven gating.
- **`/audit:refactor`** — repo-wide refactor opportunities, plus staged execution of chosen candidates. Type-shaped execution delegates to `/typescript:migrate`.
- **`/audit:a11y`** — accessibility audit on any frontend source.

### Commit-time gating

- **`/postmortem`** — pre-commit orchestrator; decides whether `/typescript:review` fires. Don't invoke `/typescript:review` directly.
- **`/typescript:review`** — TypeScript review gate; returns PASS or BLOCK. Two invocation paths: `/postmortem` invokes diff mode as part of the commit chain; `/ui:component:compose` and `/tests:compose` invoke file mode after writing a new file. Don't invoke directly outside those paths unless the user asks for a review explicitly.
