# REFERENCE.md

> **Scope:** inventory of the `ui` package surface — components, hooks, primitives, providers, and the recipe system. Authoring conventions live in [`../../CONVENTIONS.md`](../../CONVENTIONS.md).

## 1. Component inventory

**Inputs & form fields** — `input` · `textarea` · `select` · `combobox` · `checkbox` · `radio` · `switch` · `slider` · `number-input` · `currency-input` · `credit-card-input` · `phone-input` · `zipcode-input` · `address-input` · `mask-input` · `date-picker` · `calendar` · `file-upload` · `search-input` · `tag-input` · `signature-pad` · `password-input` · `password-confirm` · `password-strength` · `toggle-icon-button`

**Form structure** — `form` · `fieldset` · `control` · `submit-button`

**Buttons & actions** — `button` · `copy-button` · `hold-button`

**Navigation** — `navbar` · `nav` · `sidebar` · `bottom-nav` · `breadcrumb` · `menu` · `tabs` · `toolbar` · `stepper` · `link` · `command-palette`

**Overlays** — `dialog` · `drawer` · `sheet` · `popover` · `tooltip` · `confirm` · `alert` · `banner` · `toast`

**Data display** — `data-table` · `table` · `editable-grid` · `pivot-table` · `query-builder` · `list` · `listbox` · `tree` · `kanban` · `json-tree` · `pagination` · `dl` · `timeline` · `stat` · `odometer` · `time-ago` · `status` · `badge` · `avatar` · `kbd` · `code`

**Layout & surfaces** — `box` · `flex` · `grid` · `stack` · `group` · `split` · `container` · `card` · `frame` · `glass` · `divider` · `spacer` · `aspect-ratio` · `scroll-area` · `resizable` · `collapse` · `accordion` · `segment` · `placeholder`

**Typography** — `heading` · `text` · `icon`

**Feedback** — `loading` · `progress`

**Domain & specialized** — `map` · `pdf-viewer` · `chat-message` · `chat-prompt` · `filters`

**Escape hatches** — `headless`

## 2. Hooks, primitives, providers

**Hooks** (`ui/hooks`):

- *State* — `useControllable` (controlled/uncontrolled value), `useDeferredToggle`, `useSelectableValueChange`
- *Floating & overlays* — `useFloatingUI`, `useFloatingPanel`, `useFloatingDisclosure`, `useOffcanvas`, `useDismissable`, `useScrollLock`
- *Interaction* — `useKeybindings`, `useKeyboardSettled`, `useRoving` (roving tabindex), `useHasHover`, `useMaskedInput`
- *Measurement & layout* — `useResizeObserver`, `useMediaQuery`, `useMinWidth`, `useIsTruncated`, `useScrollWithin`, `useIdScope`
- *Drag & drop* — `useSortableItem`, `useSortableList`, `useSortableSensors`

**Primitives** (`ui/primitives/<name>`) — `panel`, `overlay`, `popover`, `floating-surface`, `offcanvas`, `control`, `density`, `polymorphic`, `touch-target`, `reduced-motion`, `ready-reveal`, `active-indicator`, `affix`, `current`, `join`, `link`, `option`, `toggle`, `virtual-options`.

**Providers** (`ui/providers/<name>`) — `announcer`, `density`, `link`, `locale`, `motion`, `skeleton`, `toast`.

## 3. Recipes

Variants flow through a layered recipe system in `packages/ui/src/recipes/`:

- **Kiso** (design tokens — primitive atoms plus semantic archetype bundles)
- **Katakana** (the bridge — wires injected tokens into recipe surfaces; never imports kiso values)
- **Kata** (per-component recipe; the only layer that touches kiso)

A component reads one curated surface (`recipes/kata/<name>`) and exposes the result as props. The three ways a kata reaches the layers below, the boundary contract (cross-layer value imports are forbidden, pinned by tests), and the per-archetype tables live in [`src/recipes/README.md`](src/recipes/README.md).

## 4. Composing a new component

```
packages/ui/src/components/<name>/
  Component             <name>.tsx
  Sub-components        <name>-<part>.tsx
  Slot parts            slots.ts (.tsx only if it exports JSX)
  Hooks                 use-<name>-<hook>.ts
  React context         context.ts (.tsx only if it exports JSX)
  Prop/data types       types.ts
  Recipe config         variants.ts
  Barrel                index.ts (re-exports only)
```

When the folder name is plural, the singular stem prefixes its sub-files (`tabs/` → `tab.tsx`, `tab-list.tsx`). A namespace directory that ships only a family of parts has no `<name>.tsx` main — its barrel re-exports the parts directly (`dl`, `progress`, `resizable`, `status`). Both shapes, the bare-file allowlist, and the filename-matches-export rule are pinned by `component-filename-boundary.test.ts`.

Enforced by boundary tests (`packages/ui/src/__tests__/.../boundary/`). Add a demo and a test that renders via `renderUI()` and asserts on `data-slot`.

## 5. Commands

| Goal | Where | Command |
|---|---|---|
| Build | root | `turbo run build` |
| Typecheck | root | `turbo run check-types` |
| Lint | root | `biome check .` |
| Tests (scoped) | `packages/ui` | `pnpm test:related` / `pnpm test:changed` |
| Dev (docs site) | `packages/ui` | `pnpm docs` |

## 6. Where to look

| Goal | Path |
|---|---|
| Components | `packages/ui/src/components/<name>/*` |
| Component demos | `packages/ui/src/docs/demos/*` |
| Recipe system | [`src/recipes/README.md`](src/recipes/README.md) |

---

**See also:** [README.md](README.md), [`src/recipes/README.md`](src/recipes/README.md).
