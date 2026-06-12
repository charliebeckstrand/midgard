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

## 2. Server and client boundaries

The library splits into two tiers. **Static components** carry no `'use client'` directive and read no context, so they render in React Server Components; size and spacing are explicit props with `md` recipe defaults. **Client components** keep `'use client'` in their own file (per [CONVENTIONS.md](../../CONVENTIONS.md) §2.2) and may read context freely.

The boundary rule: ambient styling state crosses the server/client boundary through the DOM, never through React context. Context cannot reach a server-rendered child passed through a client parent; data attributes and CSS can. Concretely:

- Hosts size their slot indicators with recipe projections: `shaku.icon` rows on Button/Badge/Sidebar, stepped-down icon and spinner rows on the control affix slots (`kiso/control/affix`). A projection owns its slot; an explicit `size` on a slot icon or spinner does not override it.
- Card projects non-md section padding onto direct `data-slot=card-*` children; AvatarGroup projects descendant avatar sizes; Table projects density, grid, and stripes onto descendant cells; DescriptionList projects orientation layout onto its `dt`/`dd` children. Direct-child and exact-depth selectors keep nested instances independent.
- `AffixContext` remains for client slot children (a Button inside an Input affix still steps down); static leaves never read it.
- `DensityProvider` reaches client components only (Input, Button, Tabs, Menu, …). Static atoms ignore it; pass `size`/`space`/`gap` explicitly. A Badge in a control affix slot takes `size` one step below the control: the affix compensation constants assume the stepped-down chip.
- Loading UI is composed explicitly from the `<Name>Skeleton` variants ([CONVENTIONS.md](../../CONVENTIONS.md) §3.7); the variants are themselves static.
- Static leaves that link route through `PolymorphicStatic`: `href` renders a plain anchor, `render={<Link />}` composes the app router link per call site. Client components keep `Polymorphic`, which resolves the `<UIProvider>`-registered link from context.

`static-component-boundary.test.ts` pins the contract: it scans every listed source file (the list lives in that test) for directives, hook calls, and ambient imports. The scan is source-level only; a transitive client-only pull through a new dependency surfaces at the consuming app's `next build`, not here.

Follow-up candidates that still read ambient context for styling or formatting only: `locale` (an API decision: explicit props or app wrappers, since formats can't move to CSS) and `glass` (worth migrating once a static surface grows a glass variant; today every reader is client by necessity).

## 3. Hooks, primitives, providers

**Hooks** (`ui/hooks`):

- *State* — `useControllable` (controlled/uncontrolled value), `useDeferredToggle`, `useSelectableValueChange`
- *Floating & overlays* — `useFloatingUI`, `useFloatingPanel`, `useFloatingDisclosure`, `useOffcanvas`, `useDismissable`, `useScrollLock`
- *Interaction* — `useKeybindings`, `useKeyboardSettled`, `useHasHover`, `useMaskedInput`
- *Accessibility* — `useA11yScope` (base), `useA11yPanel`, `useA11yControl`, `useA11yDisclosure` (trigger/panel pairing), `useA11yRoving` (roving tabindex), `useA11yAutoFocus`, `useA11yLiveRegion`, `useA11yAnnouncements` (declarative live narration), `useAriaIds`
- *Measurement & layout* — `useResizeObserver`, `useMediaQuery`, `useMinWidth`, `useIsTruncated`, `useScrollWithin`, `useIdScope`
- *Drag & drop* — `useSortableItem`, `useSortableList`, `useSortableSensors`

**Primitives** (`ui/primitives/<name>`) — `panel`, `overlay`, `popover`, `floating-surface`, `offcanvas`, `control`, `density`, `polymorphic`, `touch-target`, `reduced-motion`, `ready-reveal`, `active-indicator`, `affix`, `current`, `join`, `link`, `option`, `toggle`, `virtual-options`.

**Providers** (`ui/providers/<name>`) — `density`, `link`, `locale`, `motion`, `toast`. Providers configure client components; static components take explicit props (§2).

The screen-reader announcer needs no provider: import the imperative `announce` from `ui/core` for one-off messages, or `useA11yAnnouncements` (hooks) to narrate a changing value. Its live region is created on `document.body` on first use.

## 4. Recipes

Variants flow through a layered recipe system in `packages/ui/src/recipes/`:

- **Kiso** (design tokens — primitive atoms plus semantic archetype bundles)
- **Katakana** (the bridge — wires injected tokens into recipe surfaces; never imports kiso values)
- **Kata** (per-component recipe; the only layer that touches kiso)

A component reads one curated surface (`recipes/kata/<name>`) and exposes the result as props. The three ways a kata reaches the layers below, the boundary contract (cross-layer value imports are forbidden, pinned by tests), and the per-archetype tables live in [`src/recipes/README.md`](src/recipes/README.md).

## 5. Composing a new component

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

## 6. Commands

| Goal | Where | Command |
|---|---|---|
| Build | root | `turbo run build` |
| Typecheck | root | `turbo run check-types` |
| Lint | root | `biome check .` |
| Tests (scoped) | `packages/ui` | `pnpm test:related` / `pnpm test:changed` |
| Dev (docs site) | `packages/ui` | `pnpm docs` |

## 7. Where to look

| Goal | Path |
|---|---|
| Components | `packages/ui/src/components/<name>/*` |
| Component demos | `packages/ui/src/docs/demos/*` |
| Recipe system | [`src/recipes/README.md`](src/recipes/README.md) |

---

**See also:** [README.md](README.md), [`src/recipes/README.md`](src/recipes/README.md).
