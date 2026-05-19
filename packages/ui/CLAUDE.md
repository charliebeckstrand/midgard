# packages/ui — CLAUDE.md

## Skills

UI-specific skills (project-wide skills are documented in the root `CLAUDE.md`):

### Authoring

- **`/ui:component:recommend`** — recommend new components for the library.
- **`/ui:component:compose`** — scaffold a new UI component. Canonical source for `[layout-heuristics]` and `[framework-discipline]` (cited by `/ui:audit`).
- **`/ui:docs:compose`** — scaffold a docs page or demo for a UI component.

### Auditing

- **`/ui:audit`** — per-component health audit.
- **`/ui:docs:audit`** — docs files audit.
- **`/audit:a11y`** — accessibility audit on frontend components.

## Testing

This package owns the repo's only test runner (`vitest`). The lefthook pre-commit run gates "everything green". **Inside the editing loop, never invoke `pnpm --filter ui test` or `pnpm test`.** Run a scoped subset; let lefthook catch anything the scoped run missed at commit time.

Skills that run tests (`/typescript:review`, `/tests:compose`, `/postmortem`) prefer the package's scoped test commands (`scripts.test:related`, `scripts.test:changed`) automatically — they fall back to the full package suite only when no scoped command applies.

## Tests skip list

- Tests that drive a third-party async lifecycle (`fetch`, `@tanstack/react-virtual`, floating-ui, pdfjs, etc.)

These have flaked on Linux-based Azure CI. They pass locally.

Cover the surface at a synchronous seam — a pure reducer, a typed harness, a unit-level callback — or skip it.

## File naming

Filenames must stay legible when stripped of folder context (editor tabs, stack traces, grep results, PR diffs).

Inside `src/components/<name>/` (and the parallel `primitives/`):

| Kind | Pattern | Constraint |
|---|---|---|
| Main component | `<name>.tsx` | matches the folder name. Never `component.tsx`. |
| Sub-components | `<name>-<part>.tsx` | prefixed with the folder name; never bare (`item.tsx`, `trigger.tsx`). Plural folders accept the singular stem (`tabs/tab.tsx` for `Tab`). |
| Hooks | `use-<name>-<hook>.ts` (or `.tsx` when the hook returns JSX) | folder name (or its singular stem) appears in every hook filename. Never bare. |
| Context | `context.ts` | `.tsx` only when the file exports a provider component containing JSX. |
| Types | `types.ts` | when extracted from the main file. |
| Variants | `variants.ts` | when the recipe / `tailwind-variants` config is extracted alongside the component. |
| Slots | `slots.tsx` (or `slots.ts`) | for components exposing a composable slot API. |
| Barrel | `index.ts` | re-exports only. |

When in doubt, prefix with the folder name.

Every component or hook file exports a symbol whose PascalCase (or `useCamelCase`) form matches the filename — `tag-input-badge.tsx` exports `TagInputBadge`; `use-tag-input-keyboard.ts` exports `useTagInputKeyboard`. `src/__tests__/components/boundary/component-filename-boundary.test.ts` enforces this; it carries an inline `ALLOWLIST` of grandfathered exceptions where renaming would break a stable public API (`Field`, `Label`, `ConfirmDialog`, `QueryRule`). Never extend the allowlist for new files (or for renames/moves of allowlisted files) — fix the file or the export.

## Constant naming

Module-level constants (typically in `-constants.ts`):

- **`UPPER_SNAKE_CASE`** for named magic values — primitives, fixed enumerations, sentinel defaults.
- **`camelCase`** for keyed data — lookup tables, config objects, initial-state shapes.

If you'd inline it as a literal, `UPPER_SNAKE`. If you'd index into it, `camelCase`.
