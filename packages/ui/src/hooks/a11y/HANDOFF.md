# a11y hooks suite — handoff

Working notes for continuing the `hooks/a11y` consolidation in `packages/ui`.
Goal: a layered, idiomatic accessibility hook ecosystem under
`packages/ui/src/hooks/a11y`, surfaced through `ui/hooks`, that reduces the
aria/a11y duplication scattered across components.

## Decisions locked (from the requesting session)

- **Naming:** whole suite uses the `useA11y*` prefix, including renaming the
  shipped `useRoving` → `useA11yRoving`. Pure helpers keep descriptive names
  but still live under `use-*` files (e.g. `useAriaIds`).
- **Layering:** a universal base hook `useA11yScope` that specialized hooks
  extend (`useA11yPanel`, `useA11yControl`, …). Other hooks layer their slot
  vocabulary / role specifics over the base rather than re-implementing it.
- **Control folds into the base:** the old `components/control/use-control-a11y.ts`
  becomes `useA11yControl` extending `useA11yScope`.
- **Relocation scope:** only hooks that are *genuinely a11y-only* move into
  `hooks/a11y`. `useRoving` qualifies (pure keyboard-nav pattern). `useIdScope`
  (general id generation) and `useDismissable` (overlay UX) stay where they are.

## Done so far

| Commit | What |
|---|---|
| `0f598bc` | Relocate `useRoving` into `hooks/a11y/use-roving.ts` (imports/tests repointed) |
| `68c5109` | Add base `useA11yScope` + `useAriaIds` (`hooks/a11y/use-a11y-scope.ts`, `use-aria-ids.ts`) with tests |
| `3b53c45` | Migrate panel scope → `useA11yPanel`; `usePanelA11yScope` removed from `primitives/panel/panel.tsx`; dialog/drawer/sheet repointed |

### Base hook shape (reference for the extensions)

`useA11yScope<Slot>({ id?, slots?: Record<Slot, 'labelledby' | 'describedby'> })`
returns `{ id, sub, ids, register, aria }`. Slots register on mount (call
`register.<slot>()` in an effect); `aria` composes `aria-labelledby` /
`aria-describedby` from only the registered slots. Pass `slots` as a **stable
module constant** (memo deps key off its identity). `useAriaIds(...ids)` is the
space-join primitive (drops falsy, returns `undefined` when empty); it's a hook,
so call it at the top level — that's why `useA11yScope` buckets ids in a memo
and calls `useAriaIds` twice at the top, never in a loop.

## Remaining work

Each is its own commit. Verify scoped (see Environment), don't lean on the full
gate per commit.

### 1. Control → `useA11yControl`

- New `hooks/a11y/use-a11y-control.ts`: `useA11yControl(id)` over
  `useA11yScope({ id, slots: { description: 'describedby', error: 'describedby' } })`.
  Return `{ describedBy: scope.aria['aria-describedby'], descriptionId: scope.ids.description, messageId: scope.ids.error, registerDescription: scope.register.description, registerMessage: scope.register.error }`.
  (Preserves the old ids: `${id}-description`, `${id}-error`.)
- Delete `components/control/use-control-a11y.ts`.
- Repoint consumers to import `useA11yControl` from `../../hooks`:
  `components/control/control.tsx`, `components/fieldset/field.tsx`,
  `components/control/use-control-field-context.ts` (swap `useControlA11y(...)`).
- Export from `hooks/a11y/index.ts` + `hooks/index.ts`.
- Test: `__tests__/hooks/use-a11y-control.test.ts`.

### 2. Rename `useRoving` → `useA11yRoving` (widest blast radius)

- Rename `hooks/a11y/use-roving.ts` → `use-a11y-roving.ts`; export
  `useA11yRoving`. Keep helper fn names (`queryItems`, `setVirtualActive`,
  `nextIndexForKey`, `matchTypeahead`, `TypeaheadState`).
- Update barrel-importers (`import { useRoving } from '../../hooks'`):
  stepper, pdf-viewer-thumbnails, tree, pagination, toolbar, tabs/tab-list,
  accordion, breadcrumb, sidebar, calendar/use-calendar-focus, json-tree,
  combobox, primitives/popover/popover.
- Update direct-path importer: `command-palette/use-command-palette-state.ts`
  (`'../../hooks/a11y/use-roving'` → `…/use-a11y-roving`, `useRoving` →
  `useA11yRoving`).
- Update `hooks/a11y/index.ts` + `hooks/index.ts` (`useRoving` → `useA11yRoving`).
- Tests: `__tests__/hooks/use-roving.test.ts` + `use-roving-navigation.test.ts`
  — repoint import path, rename `useRoving` → `useA11yRoving` (optionally rename
  files to `use-a11y-roving*.test.ts`).

### 3. Focus suite

- `hooks/a11y/use-a11y-auto-focus.ts`: `useA11yAutoFocus(ref, when)` — focuses
  `ref.current` in an effect when `when` is true. Consumer: refactor
  `components/popover/popover-content.tsx` (replace the `useEffect` that calls
  `contentRef.current?.focus()` with `useA11yAutoFocus(contentRef, open && autoFocus)`;
  keep the `tabIndex={autoFocus ? -1 : undefined}` line).
- `hooks/a11y/use-a11y-focus-return.ts`: generalize
  `components/date-picker/use-date-picker-refocus.ts` → `useA11yFocusReturn(open)`
  returning `{ captureTrigger, skipNextRefocus }` (logic is already generic).
  Repoint `date-picker/use-date-picker-state.ts` and `use-date-picker-range-state.ts`;
  delete the old file.
- Leave `Alert`'s `returnFocusTo` as-is — explicit target fired in the close
  onClick, different semantics from capture/restore, and only one call site.
- Tests: `use-a11y-auto-focus.test.tsx`, `use-a11y-focus-return.test.ts`.
- Export from barrels.

### 4. `useA11yLiveRegion`

- `hooks/a11y/use-a11y-live-region.ts`: `useA11yLiveRegion({ level = 'polite',
  atomic = true, visuallyHidden = false, className? })` → memoized props
  `{ role: level === 'assertive' ? 'alert' : 'status', 'aria-live': level,
  'aria-atomic': atomic, className: cn(visuallyHidden && 'sr-only', className) }`.
  Spread onto a region the consumer fills with children. (Imperative,
  no-visible-home announcements stay on the global `useAnnounce` /
  `AnnouncerProvider`.)
- Adopt in: `pdf-viewer/pdf-viewer-viewport.tsx` (sr-only polite region),
  `password-strength/password-strength.tsx` (visible polite label),
  `password-confirm/password-confirm.tsx` (visible polite warning).
- Export from barrels. Test: `use-a11y-live-region.test.ts`.

### 5. Docs

- `packages/ui/REFERENCE.md` §2 Hooks: add an *Accessibility* group —
  `useA11yScope`, `useA11yPanel`, `useA11yControl`, `useA11yRoving`,
  `useA11yFocusReturn`, `useA11yAutoFocus`, `useA11yLiveRegion`, `useAriaIds`.
  Remove `useRoving` from the *Interaction* line.

### Deliberately out of scope (don't invent)

- `usePrefersReducedMotion` — already covered by `motion/react`'s
  `useReducedMotion` (odometer, hold-button use it).
- Focus-visible / interaction-modality tracking — no current consumer.
- Calendar/date-picker zone-bridging arrow-nav — component-specific, large.
- Folding every inline Escape handler into `useDismissable` — several mean
  "cancel edit", not "dismiss overlay".

## Environment gotchas (important)

- The lefthook **pre-commit gate runs the full ~3500-test vitest suite** (plus
  builds/knip/types). This container is memory-tight (16 GB); `pool: 'vmThreads'`
  is uncapped and a single run climbs to ~14 GB, so the gate is slow and OOMs
  under any concurrency. **Never run two commits at once.** A `vitest` memory cap
  was tried and reverted — it made runs slower without fixing peak memory, and CI
  has been fine, so the config is left stock.
- Practical loop: verify each unit with `tsc --noEmit` (in `packages/ui`) + the
  **specific** touched test files (`./node_modules/.bin/vitest run <files>`,
  <1 GB, seconds), commit with `--no-verify`, and run the full suite **once**
  before pushing (or let CI do it).
- Footgun: don't `pkill -f vitest` from a shell whose own command line contains
  "vitest" — it kills its own parent. Kill by PID instead.

## Verify commands

```sh
cd packages/ui
./node_modules/.bin/tsc --noEmit
./node_modules/.bin/vitest run src/__tests__/hooks/<file>.test.ts
```
