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

Targets and cases below were removed because they consistently flaked on Azure CI under Linux Node 20 with no local repro. **Do not recreate them.** If a future change makes them viable again, the recreation MUST be paired with evidence — a green Azure CI run across at least 20 sequential triggers, or a documented seam (typed harness, deterministic mock) that eliminates the flake root cause. Note the evidence in the PR; an audit gap is the lesser cost.

| Target | Removed in | Root cause |
|---|---|---|
| `DataTableVirtualizedBody` component suite (`__tests__/components/data-table-virtualized-body.test.tsx`) | `5660409` | Mocked `@tanstack/react-virtual` via mutable module-scope bindings; virtualizer state never propagated through the render under Azure's Node 20 |
| `usePdfViewerDocument` async cases — fetch-error, fetch-throw, successful-render (`__tests__/components/use-pdf-viewer-document.test.ts`) | `4a2f731` | Rode the real async lifecycle through dynamic `import()` + `fetch` + pdfjs render; state never propagated through the multi-`await` chain on Azure CI |
| `QueryBuilder` listbox-interaction cases (`__tests__/components/query-builder.test.tsx`) | `61d3f91` | Floating-UI / listbox open lifecycle was non-deterministic on Azure CI |

A new test for any of these surfaces is acceptable only when it covers a different seam (a pure unit, a typed reducer, a synchronous code path) — not a re-attempt at the original integration.

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
| Variants | `variants.ts` | when the recipe / `class-variance-authority` config is extracted alongside the component. |
| Slots | `slots.tsx` (or `slots.ts`) | for components exposing a composable slot API. |
| Barrel | `index.ts` | re-exports only. |

When in doubt, prefix with the folder name.

Every component or hook file exports a symbol whose PascalCase (or `useCamelCase`) form matches the filename — `tag-input-badge.tsx` exports `TagInputBadge`; `use-tag-input-keyboard.ts` exports `useTagInputKeyboard`. `src/__tests__/components/boundary/component-filename-boundary.test.ts` enforces this; it carries an inline `ALLOWLIST` of grandfathered exceptions where renaming would break a stable public API (`Field`, `Label`, `ConfirmDialog`, `QueryRule`). Never extend the allowlist for new files (or for renames/moves of allowlisted files) — fix the file or the export.

## Constant naming

Module-level constants (typically in `-constants.ts`):

- **`UPPER_SNAKE_CASE`** for named magic values — primitives, fixed enumerations, sentinel defaults.
- **`camelCase`** for keyed data — lookup tables, config objects, initial-state shapes.

If you'd inline it as a literal, `UPPER_SNAKE`. If you'd index into it, `camelCase`.
