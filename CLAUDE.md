# CLAUDE.md

## Principles

- Hold yourself to a staff engineer standard. Challenge your own work before presenting it.
- Understand before modifying. Read the surrounding code and follow its conventions.
- Extend before inventing. Grow what's there; spin off a new module only at a genuinely distinct boundary.
- Solve the stated problem, not adjacent ones.

## Judgment

Rules for when to stop, when to ask, and when to call work done.

- **When a request is ambiguous, ask one specific clarifying question** rather than guessing or proposing N options. For genuinely fuzzy ideas (you can't form a concrete proposal from the request), route to `/deliberate`.
- **When a fix needs to broaden scope, ask first.** Never quietly turn a bug fix into a refactor.
- **When an existing shared component almost fits but is missing a capability, ask** whether extending it makes sense long-term — not just for the immediate use case. Never update a shared component without explicit approval.
- **When a skill's preconditions aren't met, stop and surface the gap** rather than improvising. Missing manifest, missing test runner, missing type-check script — each skill's expected behavior is to fail loud, not paper over.
- **When a check fails after an edit, fix the cause; never weaken the check.** If a test must legitimately change, the change earns its own commit and an explanation. Deleting assertions, marking `.skip`, or stripping `expect` calls to make a suite green is a blocking failure regardless of intent.
- **Work is done when `/postmortem` returns PROCEED** (or every chained downstream skill returns PASS — downstream skills return PASS or BLOCK) and you have re-read the diff. Until then, work is in progress.

## Architecture

- Duplication across multiple call sites earns a shared utility; a single use case does not.
- Build from small, composable pieces. Colocate what belongs together.
- Dependencies flow inward. Shared packages never depend on application code.
- Lean on the type system. Hard-to-express types signal a design problem.

## Workflow

For non-trivial work (three or more file edits, or any change spanning multiple packages), enter planning mode before writing code. Delegate research to subagents — one focused task per agent — and keep the main context window clean. Summarize at milestones, not line by line.

Formatting is tooling's job. Never fight the formatter.

## Git

- Imperative mood, atomic commits. Each commit represents one logical change, described by what it does.
- Feature branches for non-trivial work. Never force-push shared branches.
- Review your own diff before committing.

## Skills

Project skills live in `.claude/commands/`. They all read `./manifest.json` first and halt with a pointer to `/repo:manifest` if it's missing. `/repo:manifest` generates it; `/postmortem` and `/premortem` create it on demand; `/postmortem` refreshes it when a diff invalidates it. Operate silently — surface only `/repo:manifest`'s warnings.

Each skill's canonical description lives in its own file under `.claude/commands/`. The catalog below is an index — read the skill file for the full contract.

### Discovery

- **`/repo:manifest`** — discover, profile, or summarize the project; writes `./manifest.json`.

### Planning and decisions

- **`/deliberate`** — audit a council/debate verdict, or vet a decision standalone in plain language.
- **`/council`** — render a verdict on a proposal via 5 evaluators + chairman.
- **`/premortem`** — stress-test a plan via 5 failure archetypes.

**When to pick which:** use `/council` to render a verdict on a proposal; `/premortem` to stress-test a plan; `/deliberate` to audit a verdict or vet a decision in plain language.

### Authoring

- **`/tests:compose`** — write tests for any target (components, hooks, utilities, modules).
- **`/typescript:migrate`** — staged type-shaped migrations (`rename`, `lift`, `enum-to-const`, `any-to-unknown`, `jsdoc-to-ts`, `tighten`).

### Auditing

- **`/tests:audit`** — test suite audit.
- **`/typescript:audit`** — TypeScript smell audit. **Use for periodic clean-up and on-demand polish; use `/typescript:review` for change-driven gating.**
- **`/audit:refactor`** — repo-wide refactor opportunities, plus staged execution of chosen candidates. Type-shaped execution delegates to `/typescript:migrate`.

### Commit-time gating

- **`/postmortem`** — pre-commit triage. **The pre-commit orchestrator** — decides whether `/typescript:review` is necessary; do not invoke `/typescript:review` unconditionally before every commit on your own.
- **`/typescript:review`** — TypeScript review gate; returns PASS or BLOCK. **Two invocation paths:** `/postmortem` invokes diff mode as part of the commit chain; `/ui:component:compose` and `/tests:compose` invoke file mode after writing a new file. Do not invoke directly outside those paths unless the user asks for a review explicitly.