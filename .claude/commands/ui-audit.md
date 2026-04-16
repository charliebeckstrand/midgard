# Audit UI

TRIGGER when: the user asks to audit, review, or find issues in `packages/ui` at the design or architecture level — or asks about improving design patterns, component composition, API consistency, recipe structure, or best practices.

You are auditing `packages/ui` for architectural and design-level issues. Your job is to evaluate how well components are structured, composed, and integrated — then recommend improvements and fix what you can.

## Arguments

$ARGUMENTS

---

## Philosophy

Good architecture makes the next change easy. This skill evaluates whether `packages/ui` components follow the design system's established patterns for composition, layering, and API design. It does not check code formatting or naming — that is `/ui-audit-code`'s job. This skill asks: **is the design right?**

---

## How to audit

### 0. Determine scope

Parse `$ARGUMENTS` to determine what to audit:

- **The full package** (e.g., "ui", "packages/ui") — audit everything
- **A specific area** (e.g., "ui recipes", "ui overlays") — audit only that area
- **A specific component** (e.g., "ui button", "dialog") — audit only that component
- **No arguments** — ask the user what to audit

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
| Primitives | `packages/ui/src/primitives/` | Know what building blocks are available |
| Hooks | `packages/ui/src/hooks/` | Know what shared hooks exist |
| Demo inventory | `packages/ui/src/docs/demos/` | Know which components have demos |

**Identify the majority pattern for each convention** by reading 3-5 representative components (e.g., badge, button, input, card, dialog). The majority pattern is the standard.

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

#### Check C: Composition quality

Evaluate whether components properly reuse existing building blocks instead of reinventing behavior.

**Flag:**
- Components that render raw `<input>`, `<button>`, or `<select>` when `Input`, `Button`, or `Select` components exist
- Components that implement their own overlay/backdrop/escape-key logic when `Overlay` primitive exists
- Components that re-implement keyboard navigation when `useRovingFocus`, `useRovingActive`, or `useArrowAction` hooks exist
- Components that duplicate panel slot logic (title, description, body, actions) when `createPanelSlots` exists
- Components that re-implement controlled/uncontrolled state when `useControllable` exists
- Components that render raw `<a>` with conditional logic when `Polymorphic` handles this

#### Check D: Recipe design

Evaluate whether recipes follow the tier system and compose correctly.

**Flag:**
- Katachi recipes that hardcode Tailwind classes available through lower-tier recipes (kage, ki, maru, sumi, nuri, take, etc.)
- Katachi recipes that import from other katachi recipes (Tier 3 should only compose Tier 1-2)
- Missing katachi recipe when a component introduces genuinely new styling
- Unnecessary katachi recipe when a component is purely compositional (wraps other components)
- Recipe file exists at `src/recipes/katachi/<name>.ts` but is not registered in katachi index
- Katachi index entries not in alphabetical order
- Take sizing tokens that duplicate an existing size map

#### Check E: API design consistency

Evaluate whether component prop interfaces follow established patterns.

**Flag:**
- Components that accept `variant` without using the established CVA pattern
- Components with `color` prop that don't use `nuri` color tokens
- Components with `size` prop that don't use `take` sizing tokens
- Inconsistent prop naming across similar components (e.g., `onClose` vs `onDismiss` vs `onOpenChange`)
- Missing `className` prop on components that render a DOM element
- Components that don't spread remaining props onto the root element
- Props types not exported alongside the component
- `React.FC` or `React.FunctionComponent` usage (should be plain functions)

#### Check F: Skeleton and loading patterns

Evaluate whether components properly support skeleton/loading states.

**Flag:**
- Interactive or data-display components missing skeleton support when similar components have it
- Inconsistent skeleton implementation (some using `useSkeleton`, others using manual checks)
- Components that render content in skeleton mode instead of `Placeholder`
- Missing kokkaku recipe registration when skeleton support exists

#### Check G: Demo coverage and quality

Cross-reference component directories against `src/docs/demos/`.

**Flag:**
- Component exists but has no demo file
- Demo file missing `meta` export with `category`
- Demo file not using `Example` component wrapper
- Demo file not using `code` template literal helper
- Major component features not demonstrated (e.g., a component with 3 variants only shows 1)
- Demo not showing composition with other components where natural

#### Check H: Accessibility patterns

Evaluate whether components follow accessibility best practices.

**Flag:**
- Interactive components missing appropriate ARIA attributes (`role`, `aria-label`, `aria-expanded`, etc.)
- Missing keyboard interaction support on interactive components
- Focus management issues in overlay/modal components
- Missing `disabled` prop forwarding on interactive components
- Form components not using `ControlFrame` primitive or not associated with labels

---

### 3. Report findings

After completing all checks, present a summary grouped by severity:

**Structure the report as:**

```
## Audit: packages/ui

### Critical (breaks consumers, accessibility, or composition)
- [ ] ...

### Design issue (suboptimal architecture or pattern)
- [ ] ...

### Missing coverage (no demo, no skeleton support)
- [ ] ...

### Observation (not wrong, but worth discussing)
- [ ] ...
```

For each finding, include:
- The specific component or file
- What the current design is
- What it should be (referencing the established pattern or best practice)
- Why the change matters

### 4. Fix iteratively

After presenting the report, begin fixing issues — starting with critical, then design issues, then coverage gaps.

**For each fix:**
1. Make the change
2. Verify it doesn't break the build: run `pnpm turbo check-types --filter=ui`
3. Verify tests still pass: run `pnpm turbo test --filter=ui` (if tests exist)
4. Move to the next issue

**Batch related fixes** — if multiple components share the same design issue, fix them all at once, then verify once.

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

- **Scope is `packages/ui` only.** Do not audit other packages. For code-level checks (formatting, naming, imports), use `/ui-audit-code` instead.
- **Never invent new conventions.** The majority pattern in the codebase is the standard. Your job is alignment, not innovation.
- **Never add features under the guise of auditing.** If a component doesn't support skeleton mode, that's a feature gap — flag it under "Observation" and let the user decide.
- **Never modify component behavior.** Improving API design means aligning with established patterns, not changing what components do.
- **Ask before changing shared infrastructure.** If a fix requires modifying a recipe, primitive, or core utility, confirm with the user first.
- **Use subagents for scanning.** Reading 70+ component directories sequentially wastes time. Parallelize the scan phase.
- **Be thorough but concise.** Report every finding, but don't pad the report. One line per issue is enough.
