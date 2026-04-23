# Audit UI Code

TRIGGER when: the user asks to improve, clean up, or review code in `packages/ui` — or asks about code quality, formatting, naming, imports, stability, or consistency of component code. Also triggered by `/ui-component` and `/ui-testing` to verify code quality before committing.

You are auditing `packages/ui` code for deviations from established code-level conventions. Your job is to verify that every file follows the codebase's exact patterns for barrel exports, variant wiring, component structure, naming, imports, and test coverage — then fix deviations until the code is clean.

## Arguments

$ARGUMENTS

---

## Philosophy

Consistent code is readable code. This skill checks whether files follow the codebase's established code patterns — not whether the design is right (that is `/ui-audit`'s job). It asks: **does this code match the standards?**

---

## How to audit

### 0. Determine scope

Parse `$ARGUMENTS` to determine what to audit:

- **The full package** (e.g., "ui", "packages/ui") — audit all component code
- **A specific area** (e.g., "ui barrel exports", "ui tests", "ui variants") — audit only that area
- **A specific component** (e.g., "ui button", "dialog") — audit only that component's code
- **No arguments** — ask the user what to audit

### 1. Build the reference model

Before checking anything, read the codebase to establish what "correct" looks like. Do not rely on assumptions — conventions evolve.

**Scan these to build your reference:**

| What | Where | Why |
|------|-------|-----|
| Component inventory | `packages/ui/src/components/` | Know every component that exists |
| Package exports | `packages/ui/package.json` → `"exports"` field | Know what's exposed to consumers |
| Kata registry | `packages/ui/src/recipes/kata/index.ts` | Know which components have recipes |
| Test inventory | `packages/ui/src/__tests__/components/` | Know which components have tests |

**Identify the majority pattern for each convention** by reading 3-5 representative components (e.g., badge, button, input, card, dialog). The majority pattern is the standard — not what any single component does.

### 2. Run the audit checks

Work through each check below. For each check, scan *every* component in scope — do not sample. Use subagents to parallelize independent checks.

---

#### Check A: Barrel export consistency

Read every `index.ts` barrel file across all components and compare patterns.

**Flag:**
- Re-exports that don't include `type` keyword for type-only exports
- Missing component or prop type exports (e.g., exports `Badge` but not `BadgeProps`)
- Missing variant exports when `variants.ts` exists
- Wildcard re-exports (`export *`) where named re-exports are the norm (or vice versa — match the majority pattern)
- Inconsistent ordering (components before types, types before variants — match majority)

#### Check B: Variant file patterns

Read every `variants.ts` file and compare against the established pattern.

**Flag:**
- Not importing from `class-variance-authority`
- Not using `kata` reference (`const k = kata.<name>`)
- Hardcoded class strings instead of recipe references
- Missing `VariantProps` type export
- Inconsistent naming: variant instance should be `<camelCaseName>Variants`, type should be `<PascalCaseName>Variants`
- Missing `defaultVariants` when the kata recipe defines `defaults`

#### Check C: Component file patterns

Read every `component.tsx` and compare against established conventions.

**Flag:**
- Missing `data-slot` attribute on root element
- `data-slot` value doesn't match component name convention (kebab-case)
- Not using `cn()` for className composition (using raw template literals or string concatenation)
- Importing `clsx` or `classnames` directly instead of using `cn`
- `forwardRef` components without a named function (affects devtools display)
- Props type not exported
- `React.FC` or `React.FunctionComponent` usage (should be plain functions)
- Inconsistent `'use client'` directive — present on non-interactive components or missing on interactive ones
- Missing prop spreading onto root element

#### Check D: Naming conventions

**Flag:**
- Directory names not in kebab-case
- Component function names not in PascalCase
- Variant instance names not in camelCase
- Type names not in PascalCase
- `data-slot` values not in kebab-case
- Mismatch between directory name and component name (e.g., directory `copy-button` but component named `CopyBtn`)

#### Check E: Import hygiene

**Flag:**
- Relative imports reaching outside the component's own directory that should use the recipe/core/primitive barrel
- Circular import patterns
- Unused imports (defer to the linter for this — only flag if obvious)
- Importing from another component's internal files instead of its barrel export
- Inconsistent import ordering (match the majority pattern)

#### Check F: Test coverage and patterns

Cross-reference component directories against `src/__tests__/components/`.

**Flag:**
- Component exists but has no test file
- Test file exists but doesn't test `data-slot` rendering
- Test file doesn't use `renderUI` helper (using raw `render` instead)
- Test file doesn't use `bySlot` helper (using `querySelector` with data-slot directly)
- Test file doesn't test className forwarding
- Test file doesn't test skeleton mode for components that support it

#### Check G: Type safety

**Flag:**
- `any` type assertions that could be narrowed
- Missing return types on exported functions where the inferred type is complex or unstable
- Loose prop types (`Record<string, any>`, `object`) where a specific interface exists
- Type casts (`as`) that suppress legitimate type errors rather than solving them
- Missing generic constraints on generic components

#### Check H: Directive and declaration patterns

**Flag:**
- `'use client'` directive on components that have no hooks, event handlers, or motion — these are server-safe and should not be marked client-only
- Missing `'use client'` on components that use hooks, event handlers, or `motion`
- Default exports (the codebase uses named exports exclusively)
- `export default` on component files

---

### 3. Report findings

After completing all checks, present a summary grouped by severity:

**Structure the report as:**

```
## Code audit: packages/ui

### Critical (breaks build, types, or consumers)
- [ ] ...

### Inconsistency (diverges from established code pattern)
- [ ] ...

### Missing coverage (no test file, missing test patterns)
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
2. Verify it doesn't break the build: run `pnpm turbo check-types --filter=ui`
3. Verify tests still pass: run `pnpm turbo test --filter=ui` (if tests exist)
4. Move to the next issue

**Batch related fixes** — if 20 barrel files have the same inconsistency, fix them all at once, then verify once.

**Do not fix observations** unless the user asks. These are informational only.

### 5. Iterate

After fixing all flagged issues, re-run the audit checks to confirm nothing was missed or introduced. Continue until the audit comes back clean.

### 6. Summarize

When done, present a final summary:

```
## Code audit complete

**Fixed:** N issues across M files
**Remaining:** Any issues that require user input
**Verified:** Types check, tests pass
```

---

## Important

- **Scope is `packages/ui` only.** Do not audit other packages.
- **This is a code-level audit.** For architectural and design pattern concerns, use `/ui-audit` instead.
- **Never invent new conventions.** The majority pattern in the codebase is the standard. Your job is alignment, not innovation.
- **Never add features under the guise of consistency.** If a component is missing skeleton support, that's a feature gap — not a code inconsistency.
- **Never modify component behavior.** Fixing a missing `data-slot` attribute is alignment. Changing what a component renders is not.
- **Ask before changing shared infrastructure.** If a fix requires modifying a recipe, primitive, or core utility, confirm with the user first.
- **Respect the linter.** If biome or TypeScript catch something, it's already handled. Focus on conventions that tooling can't enforce.
- **Use subagents for scanning.** Reading 70+ component directories sequentially wastes time. Parallelize the scan phase.
- **Be thorough but concise.** Report every finding, but don't pad the report. One line per issue is enough.
