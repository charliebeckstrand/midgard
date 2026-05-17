# packages/ui — CLAUDE.md

## Skills

UI-specific skills (the project-wide ones are documented in the root `CLAUDE.md`):

### Authoring

- **`/ui:component:recommend`** — recommend new components for the library.
- **`/ui:component:compose`** — scaffold a new UI component. **Canonical source for `[layout-heuristics]` and `[framework-discipline]`** (cited by `/ui:audit`).
- **`/ui:docs:compose`** — scaffold a docs page or demo for a UI component.

### Auditing

- **`/ui:audit`** — per-component health audit.
- **`/ui:docs:audit`** — docs files audit.
- **`/audit:a11y`** — accessibility audit on frontend components.

## Testing

This package owns the repo's only test runner (`vitest`). The lefthook pre-commit run gates "everything green". **Inside the editing loop, never invoke `pnpm --filter ui test` or `pnpm test`.** Run a scoped subset and let lefthook catch anything the scoped run missed at commit time.

Skills that run tests (`/typescript:review`, `/tests:compose`, `/postmortem`) prefer the package's scoped test commands (`scripts.test:related`, `scripts.test:changed`) automatically — they only fall back to the full package suite when no scoped command applies.

## File naming

Filenames must stay legible when stripped of folder context (editor tabs, stack traces, grep results, PR diffs).

Inside `src/components/<name>/` (and the parallel `primitives/`):

- **Main component:** `<name>.tsx` — matches the folder name. Never `component.tsx`.
- **Sub-components:** `<name>-<part>.tsx` — prefixed with the folder name. Never bare (`item.tsx`, `trigger.tsx`). When the folder name is plural, the singular stem is also accepted (`tabs/tab-list.tsx`, `tabs/tab.tsx`) — match the part's component name (`TabList`, `Tab`).
- **Hooks:** `use-<name>-<hook>.ts` (or `.tsx` when the hook returns JSX). The folder name (or its singular stem) appears in every hook filename. Never bare (`hook.ts`, `use-state.ts`).
- **Context:** `context.ts`. Use `.tsx` only when the file exports a provider component containing JSX.
- **Types:** `types.ts` when extracted from the main file.
- **Variants:** `variants.ts` when the recipe / `class-variance-authority` config is extracted alongside the component.
- **Slots:** `slots.tsx` (or `slots.ts`) for components exposing a composable slot API.
- **Barrel:** `index.ts`, re-exports only.

When in doubt, prefix with the folder name.

Every component or hook file must also export a symbol whose PascalCase (or `useCamelCase`) form matches the filename — `tag-input-badge.tsx` exports `TagInputBadge`, `use-tag-input-keyboard.ts` exports `useTagInputKeyboard`. `src/__tests__/components/boundary/component-filename-boundary.test.ts` enforces this; it carries an inline `ALLOWLIST` of grandfathered exceptions where renaming would break a stable public API (`Field`, `Label`, `ConfirmDialog`, `QueryRule`, etc.). Never extend that allowlist for new files (any file not currently in the `ALLOWLIST`, including renames or moves of allowlisted files) — fix the file or fix the export.
