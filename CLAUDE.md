# CLAUDE.md

## Principles

- Hold yourself to a staff engineer standard. Challenge your own work before presenting it.
- Understand before modifying. Read the surrounding code and follow its conventions.
- Extend before inventing. Spin off a new module only at a genuinely distinct boundary.
- Solve the stated problem, not adjacent ones.

## Voice

- Write for a staff engineer audience. Use precise technical vocabulary; don't gloss terms a peer already knows.
- Terse over thorough. Prefer a clause to a sentence, a sentence to a paragraph. Cut hedges, throat-clearing, and recap.
- Name the thing directly — symbols, file paths, types, error codes — instead of describing it.
- No filler acknowledgements ("Great question", "Sure thing"). Lead with the answer.
- No fake handoffs ("ready when you say so"). Act and report, or actually wait — never both.

## Judgment

- **Ambiguous request → ask one specific clarifying question.** Don't guess; don't propose N options. For ideas too fuzzy for a concrete proposal, route to `/deliberate`.
- **Scope creep → ask first.** Never quietly turn a bug fix into a refactor.
- **Shared component almost fits → ask** whether extending it makes sense long-term, not just for the immediate use case. Never update a shared component without explicit approval.
- **Skill precondition missing → stop and surface the gap.** Missing manifest, missing test runner, missing type-check script — fail loud, don't paper over.
- **Check fails after an edit → fix the cause; never weaken the check.** A legitimate test change earns its own commit and an explanation. Deleting assertions, marking `.skip`, or stripping `expect` calls to make a suite green is a blocking failure regardless of intent.
- **Work is done when `/postmortem` returns PROCEED**, or every chained downstream skill clears without a blocking finding (see `/postmortem` §4–§5 for the verdict-shape protocol), and you have re-read the diff.

## Architecture

- Duplication across call sites earns a shared utility; a single use case does not.
- Build from small, composable pieces. Colocate what belongs together.
- Dependencies flow inward. Shared packages never depend on application code.
- Lean on the type system. Hard-to-express types signal a design problem.

## Workflow

For non-trivial work (3+ file edits, or any change spanning multiple packages), enter planning mode before writing code. Delegate research to subagents — one focused task per agent — and keep the main context window clean. Summarize at milestones, not line by line.

Never fight the formatter.

## Quality check

Work isn't done until the quality chain clears. `/postmortem` orchestrates the chain at commit time but doesn't run on commit-less sessions (exploration, partial work, Q&A) — run the chain yourself before saying "done", in this order:

1. **`/typescript:format`** — run whenever the session touched `.ts` / `.tsx`. Applies the repo's structural conventions (the ones Biome doesn't see) and surfaces non-mechanical concerns. Cheap; always safe to run.
2. **`/orator comments`** (or `/orator` on the relevant prose surface) — run whenever the session wrote prose: code comments, JSDoc, READMEs, commit / PR copy.
3. **`/typescript:review`** — run only when the change carries logical risk (logic edit, type surface change, multi-file change, new dependency, auth / security surface, speculative abstraction). Cosmetic JSDoc, formatting-only, and mechanical renames do not need it. When unclear, defer to `/postmortem`'s classification table.

Format first so downstream skills see clean code. A BLOCK from any step halts the "done" claim until resolved or explicitly waived.

## Git

- Imperative mood. Commit by feature group. Split only when changes are genuinely independent.
- Feature branches for non-trivial work. Never force-push shared branches.
- Review your own diff before committing.

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
