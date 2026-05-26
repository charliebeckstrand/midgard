# packages/ui

## Skills

UI-specific skills (project-wide skills live in the root `CLAUDE.md`):

- `/ui:component:recommend` — recommend new components for the library
- `/ui:component:compose` — scaffold a new component; canonical source for `[layout-heuristics]` and `[framework-discipline]`, cited by `/ui:audit`
- `/ui:docs:compose` — scaffold a docs page or demo
- `/ui:audit` — per-component health audit
- `/ui:docs:audit` — docs files audit
- `/audit:a11y` — accessibility audit on frontend components

## Testing

This package owns the repo's only test runner (`vitest`). Lefthook gates "everything green" pre-commit.

- Inside the editing loop, never run `pnpm --filter ui test` or `pnpm test`. Run a scoped subset; let lefthook catch the rest at commit.
- Skills that run tests (`/typescript:review`, `/tests:compose`, `/postmortem`) prefer scoped commands (`scripts.test:related`, `scripts.test:changed`); they fall back to the full suite only when no scoped command applies.
- Skip tests that drive a third-party async lifecycle (`fetch`, `@tanstack/react-virtual`, floating-ui, pdfjs). They flake on Linux-based Azure CI; they pass locally. Cover the surface at a synchronous seam — a pure reducer, a typed harness, a unit-level callback — or skip it.

## File naming

Filenames must stay legible stripped of folder context — editor tabs, stack traces, grep results, PR diffs.

Inside `src/components/<name>/` (and the parallel `primitives/`):

| Kind | Pattern | Constraint |
|---|---|---|
| Main component | `<name>.tsx` | matches the folder name; never `component.tsx` |
| Sub-components | `<name>-<part>.tsx` | prefixed with the folder name; never bare (`item.tsx`, `trigger.tsx`). Plural folders accept the singular stem (`tabs/tab.tsx` for `Tab`) |
| Hooks | `use-<name>-<hook>.ts` (`.tsx` when the hook returns JSX) | folder name (or its singular stem) appears in every hook filename; never bare |
| Context | `context.ts` | `.tsx` only when the file exports a provider component containing JSX |
| Types | `types.ts` | when extracted from the main file |
| Variants | `variants.ts` | when the recipe config is extracted alongside the component |
| Slots | `slots.tsx` (or `slots.ts`) | for components exposing a composable slot API |
| Barrel | `index.ts` | re-exports only |

When in doubt, prefix with the folder name.

Every component or hook file exports a symbol whose PascalCase (or `useCamelCase`) form matches the filename — `tag-input-badge.tsx` exports `TagInputBadge`; `use-tag-input-keyboard.ts` exports `useTagInputKeyboard`. `src/__tests__/components/boundary/component-filename-boundary.test.ts` enforces this. It carries an inline `ALLOWLIST` of grandfathered exceptions (`Field`, `Label`, `ConfirmDialog`, `QueryRule`) where renaming would break a stable public API. Never extend the allowlist for new files (or for renames/moves of allowlisted files) — fix the file or the export.

## Constant naming

Module-level constants (typically in `-constants.ts`):

- `UPPER_SNAKE_CASE` for named magic values — primitives, fixed enumerations, sentinel defaults
- `camelCase` for keyed data — lookup tables, config objects, initial-state shapes

If you'd inline it as a literal, `UPPER_SNAKE`. If you'd index into it, `camelCase`.
