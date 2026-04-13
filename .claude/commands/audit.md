# Audit Package Consistency

TRIGGER when: the user asks to audit, review, lint, check, or find inconsistencies in a package — or asks to improve, clean up, standardize, or align code with established patterns.

You are auditing a package in this monorepo for deviations from established conventions. Your job is to find every inconsistency, fix it, and verify the fix — iterating until the package is clean.

## Arguments

$ARGUMENTS

---

## Philosophy

Consistency is a feature. Every divergence from the established pattern is cognitive overhead for the next reader. This skill treats the existing conventions as the standard and methodically eliminates deviations from it. It does not invent new patterns, add features, or refactor architecture — it aligns what exists with what the codebase already decided.

---

## How to audit

### 0. Determine scope

Parse `$ARGUMENTS` to determine what to audit:

- **A package** (e.g., "ui", "heimdall", "sindri") — audit that package
- **A specific area** (e.g., "ui barrel exports", "ui tests") — audit only that area
- **A specific component** (e.g., "ui button") — audit only that component
- **No arguments** — ask the user what to audit

The rest of this skill describes auditing `packages/ui` since it is the largest and most convention-heavy package. Adapt the rules to other packages based on their own established patterns.

### 1. Build the reference model

Before checking anything, read the codebase to establish what "correct" looks like. Do not rely on assumptions — conventions evolve.

**Scan these to build your reference:**

| What | Where | Why |
|------|-------|-----|
| Component inventory | `packages/ui/src/components/` | Know every component that exists |
| Package exports | `packages/ui/package.json` → `"exports"` field | Know what's exposed to consumers |
| Katachi registry | `packages/ui/src/recipes/katachi/index.ts` | Know which components have recipes |
| Kokkaku registry | `packages/ui/src/recipes/kokkaku/index.ts` | Know which components have skeleton recipes |
| Take registry | `packages/ui/src/recipes/take/` | Know which components have sizing tokens |
| Test inventory | `packages/ui/src/__tests__/components/` | Know which components have tests |
| Demo inventory | `packages/ui/src/docs/demos/` | Know which components have demos |

**Identify the majority pattern for each convention** by reading 3–5 representative components (e.g., badge, button, input, card, dialog). The majority pattern is the standard — not what any single component does.

### 2. Run the audit checks

Work through each check below. For each check, scan *every* component — do not sample. Use subagents to parallelize independent checks.

---

#### Check A: Structural completeness

Every component directory under `src/components/<name>/` must have:

| File | Required | Condition |
|------|----------|-----------|
| `index.ts` | Always | Barrel file re-exporting public API |
| `component.tsx` (or named file) | Always | The React component(s) |
| `variants.ts` | When katachi recipe exists with `variant` or `size` | CVA wiring |

**Flag:**
- Missing `index.ts` barrel file
- Missing `variants.ts` when the component's katachi recipe defines variants/sizes
- Empty or stub files that export nothing

#### Check B: Package.json exports

Cross-reference `packages/ui/package.json` → `"exports"` against the actual component directories.

**Flag:**
- Component directory exists but has no corresponding export in package.json
- Export exists in package.json but points to a path that doesn't exist
- Export path doesn't match the convention: `"./<kebab-case-name>": { "types": "./src/components/<name>/index.ts", "default": "./src/components/<name>/index.ts" }`
- Inconsistent structure (e.g., missing `"types"` or `"default"` key)

#### Check C: Barrel export consistency

Read every `index.ts` barrel file across all components and compare patterns.

**Flag:**
- Re-exports that don't include `type` keyword for type-only exports
- Missing component or prop type exports (e.g., exports `Badge` but not `BadgeProps`)
- Missing variant exports when `variants.ts` exists
- Wildcard re-exports (`export *`) where named re-exports are the norm (or vice versa — match the majority pattern)
- Inconsistent ordering (components before types, types before variants — match majority)

#### Check D: Katachi recipe registration

Cross-reference component directories against `packages/ui/src/recipes/katachi/index.ts`.

**Flag:**
- Katachi recipe file exists at `src/recipes/katachi/<name>.ts` but is not imported/registered in the katachi index
- Katachi index imports a recipe that doesn't have a corresponding file
- Katachi index entries are not in alphabetical order
- Component uses `katachi.<name>` in its code but no recipe exists

#### Check E: Variant file patterns

Read every `variants.ts` file and compare against the established pattern.

**Flag:**
- Not importing from `class-variance-authority`
- Not using `katachi` reference (`const k = katachi.<name>`)
- Hardcoded class strings instead of recipe references
- Missing `VariantProps` type export
- Inconsistent naming: variant instance should be `<camelCaseName>Variants`, type should be `<PascalCaseName>Variants`
- Missing `defaultVariants` when the katachi recipe defines `defaults`

#### Check F: Component file patterns

Read every `component.tsx` and compare against established conventions.

**Flag:**
- Missing `data-slot` attribute on root element
- `data-slot` value doesn't match component name convention (kebab-case)
- Not using `cn()` for className composition (using raw template literals or string concatenation)
- Importing `clsx` or `classnames` directly instead of using `cn`
- Missing skeleton support (`useSkeleton` / `Placeholder`) when other similar components have it
- Hardcoded Tailwind classes that should come from a recipe
- `forwardRef` components without a named function (affects devtools display)
- Props type not exported
- `React.FC` or `React.FunctionComponent` usage (should be plain functions)
- Inconsistent `'use client'` directive — present on non-interactive components or missing on interactive ones

#### Check G: Test coverage and patterns

Cross-reference component directories against `src/__tests__/components/`.

**Flag:**
- Component exists but has no test file
- Test file exists but doesn't test `data-slot` rendering
- Test file doesn't use `renderUI` helper (using raw `render` instead)
- Test file doesn't use `bySlot` helper (using `querySelector` with data-slot directly)
- Test file doesn't test className forwarding
- Test file doesn't test skeleton mode for components that support it

#### Check H: Demo coverage

Cross-reference component directories against `src/docs/demos/`.

**Flag:**
- Component exists but has no demo file
- Demo file missing `meta` export with `category`
- Demo file not using `Example` component wrapper
- Demo file not using `code` template literal helper

#### Check I: Naming conventions

**Flag:**
- Directory names not in kebab-case
- Component function names not in PascalCase
- Variant instance names not in camelCase
- Type names not in PascalCase
- `data-slot` values not in kebab-case
- Mismatch between directory name and component name (e.g., directory `copy-button` but component named `CopyBtn`)

#### Check J: Import hygiene

**Flag:**
- Relative imports reaching outside the component's own directory that should use the recipe/core/primitive barrel
- Circular import patterns
- Unused imports (defer to the linter for this — only flag if obvious)
- Importing from another component's internal files instead of its barrel export

---

### 3. Report findings

After completing all checks, present a summary grouped by severity:

**Structure the report as:**

```
## Audit: packages/ui

### Critical (breaks consumers or builds)
- [ ] ...

### Inconsistency (diverges from established pattern)
- [ ] ...

### Missing coverage (no test, no demo)
- [ ] ...

### Observation (not wrong, but worth noting)
- [ ] ...
```

For each finding, include:
- The specific file and line
- What the current state is
- What it should be (referencing the majority pattern)

### 4. Fix iteratively

After presenting the report, begin fixing issues — starting with critical, then inconsistencies, then coverage gaps.

**For each fix:**
1. Make the change
2. Verify it doesn't break the build: run `pnpm turbo check-types --filter=<package>`
3. Verify tests still pass: run `pnpm turbo test --filter=<package>` (if tests exist)
4. Move to the next issue

**Batch related fixes** — if 20 barrel files have the same inconsistency, fix them all at once, then verify once.

**Do not fix observations** unless the user asks. These are informational only.

### 5. Iterate

After fixing all flagged issues, re-run the audit checks to confirm nothing was missed or introduced. Continue until the audit comes back clean.

### 6. Summarize

When done, present a final summary:

```
## Audit complete

**Fixed:** N issues across M files
**Remaining:** Any issues that require user input or architectural decisions
**Verified:** Types check, tests pass
```

---

## Important

- **Never invent new conventions.** The majority pattern in the codebase is the standard. Your job is alignment, not innovation.
- **Never add features under the guise of consistency.** If a component doesn't support skeleton mode, that's a feature gap — not an inconsistency. Only flag it under "Observation."
- **Never modify component behavior.** Fixing a missing `data-slot` attribute is alignment. Changing what a component renders is not.
- **Ask before changing shared infrastructure.** If a fix requires modifying a recipe, primitive, or core utility, confirm with the user first.
- **Respect the linter.** If biome or TypeScript catch something, it's already handled. Focus on conventions that tooling can't enforce.
- **Use subagents for scanning.** Reading 70+ component directories sequentially wastes time. Parallelize the scan phase.
- **Be thorough but concise.** Report every finding, but don't pad the report. One line per issue is enough.
