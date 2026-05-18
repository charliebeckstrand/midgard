# typescript:migrate

TRIGGER when: rename a type/function across files, lift a type to a shared home, convert `enum` to `as const`, replace `any` with `unknown` + narrowing, migrate JSDoc-annotated JavaScript to TypeScript, add `satisfies` clauses across files, or tighten types from `string`/`number` to literal unions or branded types. Also invoked by `/audit:refactor` when a chosen candidate is type-shaped.

Perform type-driven migrations in staged, checkpointable steps. Each stage produces a clean diff and runs the project's type-checker and scoped tests before advancing. The repo stays valid after every stage.

This skill writes code. It runs as a sequence of small commits, each independently revertable.

## Modes

Pick the mode from the user's request. If ambiguous, ask before starting.

| Mode | What it does |
|---|---|
| **`rename`** | rename an exported symbol (type, function, class, constant) across every consumer in the repo |
| **`lift`** | move a type or utility from its current location to a shared home; update consumers |
| **`enum-to-const`** | convert one or more `enum` declarations to the `as const` object + literal-union pattern |
| **`any-to-unknown`** | replace `any` with `unknown` plus the narrowing necessary at each call site |
| **`jsdoc-to-ts`** | migrate a JS file (with JSDoc) or a folder of them to native TypeScript |
| **`tighten`** | narrow a wide type (`string` → literal union, `number` → branded type) and update every reference |

## Arguments

$ARGUMENTS

Expected shapes:

- `<mode> <target>` — e.g. `rename formatCurrency formatMoney`, `lift UserId packages/shared/src/types/user.ts`, `enum-to-const packages/ui/src/types/status.ts`, `jsdoc-to-ts packages/legacy/src`.
- `--from <path>` / `--to <path>` — explicit source and destination for `lift` mode.
- `--dry-run` — produce the staging plan without making edits. Useful when `/audit:refactor` invokes this skill and wants to inspect the plan first.

If arguments don't resolve cleanly to mode + target, ask one clarifying question before starting.

---

## 1. Manifest

Read `./manifest.json`. If missing, halt with a pointer to `/repo:manifest`.

Per package, capture:

| Field | Use |
|---|---|
| `path`, `name` | map files to packages |
| `framework` | gates TSX-specific migration patterns |
| `linter` | drives which auto-fix tools are available between stages |
| `testRunner` | drives the scoped test command per stage |
| `scripts.test`, `scripts.test:related`, `scripts.test:changed`, `scripts.check-types` | `test` and `check-types` must exist for touched packages or stage gates can't run. If either is missing, stop and tell the user. `test:related` / `test:changed` drive scoped per-stage gates when available. |
| `conventions.principles` | constrain proposed shape (e.g. "shared packages never depend on app code" constrains `lift` destinations) |

Plus top-level: `packageManager` (run commands), `monorepo.tool` (Turborepo assumed; fall back to per-package scripts otherwise).

---

## 2. Resolve scope

Identify every file the migration touches:

| Mode | Files touched |
|---|---|
| `rename` | declaration file plus every import site (grep the old name; verify each match is the same symbol, not a coincidence) |
| `lift` | declaration file plus every import site plus the destination file (new or existing) |
| `enum-to-const` | the file declaring the enum plus every file using the enum's runtime values (the *type* uses migrate naturally; the *runtime values* are the surface that changes) |
| `any-to-unknown` | the target file or directory; per-occurrence handling |
| `jsdoc-to-ts` | every `.js` / `.jsx` in the target directory plus their JSDoc types |
| `tighten` | the type declaration plus every reference site that might fail the narrower type |

Always exclude `node_modules/`, `dist/`, `build/`, `.next/`, generated declaration files.

If the scope is large (>20 files), surface the count and ask the user to confirm before starting.

---

## 3. Produce the staging plan

Per mode, the staging pattern is opinionated. Each stage is independently committable.

### 3a. `rename`

- **Stage 1: Add a deprecated alias** at the declaration site. The old name re-exports the new one, marked `@deprecated`. Type-check passes; no consumers changed. *Repo state after: both names work; old name marked `@deprecated`.*
- **Stage 2..N: Migrate each consumer**, one commit per file. Per stage: update imports in that file, run the file's scoped test, advance.
- **Final stage: Remove the deprecated alias.** Type-check + full package suite. *Repo state after: only the new name exists.*

Test gate per stage: the package's scoped test command (see §5).

### 3b. `lift`

- **Stage 1: Create the type/utility at its new home.** Add the export; existing home unchanged. *Repo state after: same shape declared twice (briefly); both exports valid.*
- **Stage 2..N: Migrate each consumer**, one commit per file. Update the import path.
- **Final stage: Remove from the old home.** Type-check + full package suite. *Repo state after: single canonical home.*

Test gate per stage: scoped tests for the touched file. Final stage also runs type-check across all packages that depend on either location.

### 3c. `enum-to-const`

- **Stage 1: Add the `as const` object and literal-union type alongside the existing enum.** Both shapes coexist.
- **Stage 2..N: Migrate each consumer.** Replace `MyEnum.Value` with the const object form (`MyConst.value`) one file at a time. Type-check after each. Consumers of the *type* (not runtime values) generally don't change — TypeScript's structural typing handles them.
- **Final stage: Remove the enum.** Type-check + full package suite.

Watch for: `const enum` usage (these inline at use sites — removal is a textual replacement). Numeric enums where consumers read the numeric value: preserve the number explicitly in the const object; otherwise drop it.

### 3d. `any-to-unknown`

Per-occurrence. Each `any` site gets its own micro-stage. Bottom-up, narrowing one site at a time.

- **Per stage**: replace one `any` with `unknown`, then add the narrowing the call site needs (`typeof`, `in`, `instanceof`, a type predicate, or a runtime check). Run scoped tests and type-check.

Test gate per stage: scoped tests for the touched file.

If a site genuinely needs `any` (e.g. interfacing with an untyped external library), leave it with an inline justification comment and move on. Surface the leftover `any` count at the end.

### 3e. `jsdoc-to-ts`

- **Stage 0 (planning): Inventory the JSDoc types** across the target. Identify shared types (used in multiple files) vs file-local types. Plan which become exported TypeScript types and which stay inline.
- **Stage 1: Create shared types in a `.ts` file** (typically `types.ts` in the target directory). No `.js` files changed yet.
- **Stage 2..N: Migrate each `.js` / `.jsx` to `.ts` / `.tsx`** one at a time. Per file:
  - Rename `.js` → `.ts` (or `.jsx` → `.tsx` if it renders JSX).
  - Convert JSDoc annotations to inline TypeScript types.
  - Resolve any type errors the conversion surfaces (JSDoc was looser than TS strict mode).
  - Run the file's scoped tests.
- **Final stage: Remove any remaining JSDoc-only build configuration** (`checkJs`, `allowJs` in `tsconfig.json` if no `.js` files remain). Type-check across the package.

Test gate per stage: scoped tests for the migrated file.

Be careful with: top-level `module.exports` patterns (must convert to `export` statements), CommonJS `require()` (must convert to `import`), and JSDoc types without direct TS equivalents (rare but exists for some `@typedef` patterns).

### 3f. `tighten`

- **Stage 1: Introduce the narrower type alongside the wider one.** E.g. add `type UserId = string & { readonly __brand: 'UserId' }` next to existing `string` usage, plus a constructor function `function userId(s: string): UserId`.
- **Stage 2: Migrate type annotations at boundaries first** — function parameters, return types, exported types. The compiler will surface every call site that's now wrong.
- **Stage 3..N: Migrate each surfaced call site** one commit at a time, using the constructor function or appropriate cast (with inline justification).
- **Final stage: Type-check the full package** to confirm no residual sites.

Test gate per stage: scoped tests for the touched file, plus type-check after each stage.

---

## 4. Premortem the plan

Produce the plan as Markdown at `~/.claude/plans/typescript-migrate-<mode>-<slug>-<timestamp>.md`, where `<slug>` is the target name kebab-cased and `<timestamp>` comes from `date +%Y%m%d-%H%M%S`. Then invoke `/premortem`; it picks the file up automatically and stress-tests through five archetypes.

If premortem returns concrete diffs to the plan, apply them. If premortem flags a Point-of-No-Return failure, restructure to add a checkpoint before the irreversible step.

For `--dry-run`, stop here. Output the plan to the user without executing.

---

## 5. Execute stage by stage

After premortem-driven revisions, ask the user to confirm execution. Per stage:

1. Perform the stage's edits.
2. Run the stage's test gate using the package's scoped test command:
   - **vitest**: `<pm> --filter=<pkg> exec vitest related --run <touched-files>` (or `--changed` after staging).
   - **jest**: `<pm> --filter=<pkg> exec jest --findRelatedTests <touched-files>`.
   - **bun / node**: `<pm> turbo test --filter=<pkg>` (full package suite; bun/node test runners don't expose change-driven flags).
3. Run the package's type-check. Read `scripts.check-types` from the manifest. If null, skip the type-check (no script declared). Otherwise invoke `<pm> turbo check-types --filter=<pkg>`.
4. If either gate fails: stop, surface, don't advance. The user fixes or aborts.
5. If both gates pass: invoke `/typescript:review` in file mode against the stage's touched files as a single space-separated path list (`/typescript:review <file-1> <file-2> ...`). BLOCK halts the stage; the user resolves or waives.
6. Ask the user to commit. **Never auto-commit.** Commit messages follow the project's git conventions (imperative mood, atomic).
7. Advance only after the previous stage is committed.

Example stage commit messages: "rename formatCurrency to formatMoney in apps/storefront", "lift UserId to packages/design-system", "convert Status enum to as-const object".

---

## 6. Wrap up

At the end of the migration:

1. Run the full package test suite for every touched package (`<pm> turbo test --filter=<pkg>`).
2. Run the full package type-check for every touched package.
3. Surface any leftover artifacts: `@deprecated` aliases that weren't removed, `any` sites that couldn't be tightened, JSDoc types without clean TS equivalents.

If the user abandons mid-migration, the repo is in a valid state at whatever stage was last committed. State which stages completed and what's left, so the migration can be resumed later.

---

## Rules

- This skill writes code; every stage produces a real diff and a real commit. Treat that responsibility carefully.
- Never bundle stages. Each stage's commit is independently revertable — the whole point of the staging pattern.
- Never auto-commit. The user approves every commit.
- Never skip the type-check gate.
- Never skip the `/typescript:review` file-mode pass at each stage. The review catches issues the migration itself might introduce (lost generics, dropped `readonly`, widened return types).
- If a stage requires a judgment call (an `any` site that genuinely needs `any`, a JSDoc type with no clean TS equivalent), surface and ask rather than guessing.
- Never modify `.gitignore`, lockfiles, CI configs, or other tracked-but-not-source files as part of a migration. If the migration needs config changes (e.g. removing `allowJs` after `jsdoc-to-ts`), surface as a separate proposed edit at the wrap-up step.
- Success means tests pass, review returns PASS, and the diff reads cleanly.
