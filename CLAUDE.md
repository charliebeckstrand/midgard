# CLAUDE.md

## Principles

- Simplicity above all. The simplest solution that fully solves the problem wins; abstractions are earned through proven need, not anticipated.
- Hold yourself to a staff engineer standard. Challenge your own work before presenting it.
- Understand before modifying. Read the surrounding code; let its conventions guide you.
- Extend before inventing. Prefer growing an existing module over creating a new one unless there is a clear, distinct boundary.
- Solve the stated problem, not adjacent ones. A bug fix is not a refactoring opportunity.
- Dependencies flow inward. Shared packages never depend on application code.
- Let the type system carry its weight. If a type is hard to express, rethink the design.

## Judgment

Rules for when to stop, when to ask, and when to call work done.

- **When a request is ambiguous, ask one specific clarifying question** rather than guessing or proposing N options. For genuinely fuzzy ideas (you can't form a concrete proposal from the request), route to `/deliberate`.
- **When a fix needs to broaden scope, ask first.** Never quietly turn a bug fix into a refactor.
- **When an existing shared component almost fits but is missing a capability, ask** whether extending it makes sense long-term — not just for the immediate use case. Never update a shared component without explicit approval.
- **When a skill's preconditions aren't met, stop and surface the gap** rather than improvising. Missing manifest, missing test runner, missing type-check script — each skill's expected behavior is to fail loud, not paper over.
- **When a check fails after an edit, fix the cause; never weaken the check.** If a test must legitimately change, the change earns its own commit and an explanation. Deleting assertions, marking `.skip`, or stripping `expect` calls to make a suite green is a blocking failure regardless of intent.
- **Work is done when `/postmortem` returns PROCEED** (or every chained downstream skill returns PASS) and the diff has been read as a reviewer would. Until then, work is in progress.

## Architecture

- Abstractions are extracted, not predicted. Duplication across multiple call sites earns a shared utility; a single use case does not.
- Build from small, composable pieces. Colocate what belongs together.
- `packages/ui/src/recipes/` is split into a public substrate layer and an internal layer. `ryu/` carries the cross-cutting scales and currents — re-exported from `src/recipes/index.ts` and consumed wherever a substrate is needed. `kata/` (per-component recipes) and `waku/` (control primitives) are internal: they live 1:1 with components, are imported via relative paths from inside the package, and are deliberately not listed in `package.json` `exports`. The boundary is pinned by `src/__tests__/recipes/internal-boundary.test.ts`.

## File naming

Filenames must stay legible when stripped of folder context — editor tabs, stack traces, grep results, PR diffs. Every file should be self-identifying anywhere it appears.

Inside `packages/ui/src/components/<name>/` (and the parallel `primitives/`):

- **Main component:** `<name>.tsx` — matches the folder name. Never `component.tsx`.
- **Sub-components:** `<name>-<part>.tsx` — prefixed with the folder name. Never bare (`item.tsx`, `trigger.tsx`). When the folder name is plural, the singular stem is also accepted (`tabs/tab-list.tsx`, `tabs/tab.tsx`) — match the part's component name (`TabList`, `Tab`).
- **Hooks:** `use-<name>-<hook>.ts` (or `.tsx` when the hook returns JSX). The folder name (or its singular stem) appears in every hook filename. Never bare (`hook.ts`, `use-state.ts`).
- **Context:** `context.ts`. Use `.tsx` only when the file exports a provider component containing JSX.
- **Types:** `types.ts` when extracted from the main file.
- **Variants:** `variants.ts` when the recipe / `class-variance-authority` config is extracted alongside the component.
- **Slots:** `slots.tsx` (or `slots.ts`) for components exposing a composable slot API.
- **Barrel:** `index.ts`, re-exports only.

When in doubt, prefix with the folder name. Bare filenames read fine inside the folder and turn into noise the moment they appear anywhere else.

Every component or hook file must also export a symbol whose PascalCase (or `useCamelCase`) form matches the filename — `tag-input-badge.tsx` exports `TagInputBadge`, `use-tag-input-keyboard.ts` exports `useTagInputKeyboard`. `packages/ui/src/__tests__/components/boundary/component-filename-boundary.test.ts` enforces this; it carries an inline `ALLOWLIST` of grandfathered exceptions where renaming would break a stable public API (`Field`, `Label`, `ConfirmDialog`, `QueryRule`, etc.). Never extend that allowlist for new files — fix the file or fix the export.

## Workflow

For non-trivial work (three or more steps), enter planning mode before writing code. Delegate research to subagents — one focused task per agent — and keep the main context window clean. Summarize at milestones, not line by line.

Formatting is tooling's job. Never fight the formatter.

## Git

- Imperative mood, atomic commits. Each commit represents one logical change, described by what it does.
- Feature branches for non-trivial work. Never force-push shared branches.
- Review your own diff before committing.

## Testing

`packages/ui` is the only package with a test runner (`vitest`). The full suite is the lefthook pre-commit gate — that one run is the source of truth for "everything green". **Inside the editing loop, never invoke `pnpm --filter ui test` or `pnpm test`.** Run a scoped subset and let lefthook catch anything the scoped run missed at commit time.

Skills that run tests (`/typescript:review`, `/tests:compose`, `/postmortem`) follow the project's scoped-command conventions automatically — they only fall back to the full package suite when no scoped command applies.

## Skills

Project-level skills live under `.claude/commands/`. Every skill except `/repo:manifest` opens by reading the Manifest at `./manifest.json`. `/postmortem` and `/premortem` create the file if it is missing; `/postmortem` additionally refreshes it when a diff invalidates it. Consumer skills stop and direct the user to run `/repo:manifest` when the file is absent.

Two Claude built-ins (`/security-review`, `/simplify`) are referenced by `/postmortem`'s chain but are not project skills — they are Anthropic-shipped capabilities invoked when available, with their concerns folded into `/typescript:review` when not.

### Discovery

- **`/repo:manifest`** — discover, profile, or summarize the project. Scans the repo and writes a canonical Manifest to `./manifest.json` that every other skill consumes.

### Planning and decisions

- **`/deliberate`** — turn a fuzzy idea into a Brief. Surveys the seed against seven dimensions (outcome, task type, scope, audience, deliverable, constraints, success criteria), asks 3–5 ABCD-style questions only on the dimensions the seed leaves open, and synthesizes the picks into a Brief precise enough to hand off.
- **`/council`** — audit, critique, or pressure-test a decision or known options. Five independent advisors, anonymous peer review, chairman's verdict with a concrete next step. Skip for trivial yes/no questions or factual lookups.
- **`/premortem`** — stress-test a drafted plan before executing it. Five failure archetypes (Scope Creeper, Boundary Breaker, Hidden Dependency Hunter, Point of No Return, User-Reality Gap), peer-reviewed anonymously, Examiner's verdict with falsifiable assumptions and a concrete diff to the plan.

**When to pick which:** `/deliberate` for *what is the work*; `/council` for *whether* or *which*; `/premortem` for *will this plan actually work*.

### Authoring

- **`/ui:component:recommend`** — recommend new components for the library. Inventories what exists, identifies real gaps against a universal category catalog, ranks by Value / Feasibility / Composability / Scope.
- **`/ui:component:compose`** — scaffold a new UI component. Reads the Manifest, samples sibling components for conventions, runs a composition-first audit, writes the component matching the discovered styling system. **Canonical source for `[layout-heuristics]` and `[framework-discipline]`** — referenced by `/ui:audit`. Delegates docs authoring to `/ui:docs:compose` and tests to `/tests:compose`.
- **`/ui:docs:compose`** — scaffold a docs page or demo for a UI component. Locates the project's docs system (demos directory, Storybook, glob registry), samples sibling demos, produces a page demonstrating the component's API surface in a form the code-derivation tooling can parse.
- **`/tests:compose`** — write tests for any target (components, hooks, utilities, modules). Detects the package via the Manifest, picks patterns matching the discovered test runner and framework, matches the codebase's formatting and conventions.
- **`/typescript:migrate`** — staged type-shaped migrations. Modes: `rename` (rename a symbol across consumers), `lift` (move a type to a shared home), `enum-to-const` (convert enums to `as const` objects), `any-to-unknown` (replace `any` with narrowed `unknown`), `jsdoc-to-ts` (migrate JS-with-JSDoc to native TS), `tighten` (narrow wide types to literal unions or branded types). Each stage is independently committable with type-check and scoped test gates. Invoked by `/audit:refactor` for type-shaped candidates; can be invoked directly.

### Auditing

- **`/ui:audit`** — per-component health audit. Complexity, single-responsibility violations, prop-surface bloat, dead variants, conditional-rendering smells, state and effect smells, split and consolidate candidates. With a component named, audits that one; with no argument, sweeps and ranks worst offenders. Cites `[layout-heuristics]` and `[framework-discipline]` from `/ui:component:compose`.
- **`/ui:docs:audit`** — docs files audit. Coverage gaps, registry hygiene, prop-surface sync, code-derivation friendliness, controls reuse, authoring conventions. Worst-offender ranking in sweep mode.
- **`/tests:audit`** — test suite audit. Coverage gaps, required-pattern drift from `/tests:compose`, runner and helper drift, mock hygiene, source-surface sync, test-layout violations. Worst-offender ranking in sweep mode.
- **`/typescript:audit`** — TypeScript smell audit. `as any`, missed narrowings, hand-rolled exhaustiveness, `enum` usage, mutable shared data, missed advanced features, convention drift. Cites the canonical principles in `/typescript:review`. **Use for periodic clean-up and on-demand polish; use `/typescript:review` for change-driven gating.**
- **`/audit:refactor`** — repo-wide refactor opportunities, **plus** staged execution of chosen candidates. Identifies duplication, layering violations, single-use abstractions, naming inconsistencies, dead exports, stale markers, and cross-file framework smells. For chosen candidates, produces a staged plan (premortem'd before execution) and runs it stage-by-stage with test gates and explicit commit approval. Type-shaped execution delegates to `/typescript:migrate`. Component-internal smells go to `/ui:audit`; type-level smells go to `/typescript:audit`.
- **`/audit:a11y`** — accessibility audit on frontend components. Semantic HTML, ARIA correctness, keyboard nav, focus management, label association, color contrast against discovered tokens, reduced-motion, alt text. Worst-offender ranking in sweep mode.

### Commit-time gating

- **`/postmortem`** — pre-commit triage. Reads the staged diff, classifies the change, routes to the smallest set of downstream skills the change actually warrants (`/security-review`, `/audit:a11y`, `/tests:compose`, `/simplify`, `/typescript:review`). Returns PROCEED for trivial diffs, BLOCK for half-finished work or debug residue. **The pre-commit orchestrator** — decides whether `/typescript:review` is necessary; do not invoke `/typescript:review` unconditionally before every commit on your own.
- **`/typescript:review`** — TypeScript review against the project's tests, type-checker, and TypeScript principles. **Two invocation paths:** `/postmortem` invokes diff mode as part of the commit chain; `/ui:component:compose` and `/tests:compose` invoke file mode after writing a new file. Do not invoke directly outside those paths unless the user asks for a review explicitly.