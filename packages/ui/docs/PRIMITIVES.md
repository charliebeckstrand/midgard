# Primitives

> **Quick-glance index of `ui/primitives/*`.** Primitives are the composable building blocks components share: the floating and overlay shells, polymorphic link/element resolution, the styling-context cascades, and the accessibility and interaction helpers. Each is its own entry point; components reach most of them indirectly, and apps rarely reach one directly. Full signatures and caveats live in each primitive's TSDoc.

```ts
import { Polymorphic } from 'ui/primitives/polymorphic'
import { TouchTarget } from 'ui/primitives/touch-target'
```

## Floating, overlay & portal surfaces

| Primitive | Summary | Key exports |
|---|---|---|
| `floating-surface` | Positioning shell shared by Tooltip, Popover, and Menu; owns the positioned wrapper and optional focus trap over a `Portal`. The wrapper carries the density scope across the portal, and its `density` prop opens a scope of its own. | `FloatingSurface` |
| `overlay` | Backdrop-and-panel shell for modal surfaces (Dialog, Sheet, Drawer) over a `Portal`: focus trap, scroll lock, dismissal, dimming scrim. Any `Chrome` region stays reachable through the trap. The root carries the density scope across the portal. | `Overlay`, `notifyOverlaySignal`, `subscribeOverlaySignal` |
| `chrome` | Marks a region as application chrome that no modal surface can seal off. The region keeps its tab stop, its accessibility-tree place, and its pointer events while the rest of the page seals (WCAG 2.1.1 / 2.4.3). Registration is by node, so no surface takes a prop and none has to name the region. | `Chrome`, `registerChrome`, `chromeRegions` |
| `popover` | Animated listbox-style floating panel (Select, Combobox, Menu) wiring roving keyboard nav, type-ahead, and open autofocus. Its `density` prop makes the panel a density scope. | `PopoverPanel` |
| `panel` | Slot family + context envelope for panel surfaces; `createPanel` builds Title/Description/Header/Body/Footer/Content with Close and A11y contexts. `PanelOverlayProps` is the shared `<Overlay>` surface Dialog, Sheet, and Drawer each forward. The deep-import module `panel/panel-splitter` gives each resize handle its focusable window splitter, `PanelSplitter`, and `panel/panel-handle` gives Drawer and Sheet their resize grip, `PanelHandle`. | `createPanel`, `PanelProviders`, `PanelClose`, `PanelTrigger`, `usePanelA11y`, `PanelA11yContext`, `usePanelCloseContext`, `PanelCloseContext`, `usePanelCloseValue` |
| `offcanvas` | React context exposing a `close()` handle so descendants can dismiss the surrounding slide-in drawer. | `OffcanvasContext` |
| `portal` | Portal-container context that resolves where library UI teleports: per-call container, then ambient `UIProvider`, then each portal's fallback. Adds `Portal`, the portal + mount-while-open + `AnimatePresence` cell the floating and overlay shells share. When a Suspense boundary or an `<Activity>` hides a surface during its exit and then reveals it, the exit completes at once. | `usePortalContainer`, `usePortalContext`, `PortalContext`, `PortalContainer`, `Portal` |
| `ready-reveal` | Gates content on a ready flag and cross-fades a placeholder to the children in one grid cell, so nothing flashes and the reveal never shifts. The root is `aria-busy` while not ready, and `loadingLabel` adds a polite live region. | `ReadyReveal` |

## Composition & polymorphism

| Primitive | Summary | Key exports |
|---|---|---|
| `polymorphic` | `href`-driven link switch with element polymorphism: renders the registered router link when `href` is present, the `as` element otherwise. | `Polymorphic`, `PolymorphicStatic`, `PolymorphicProps`, `PolymorphicStaticProps` |
| `link` | Link context exposing the framework link component an app registers (e.g. `next/link`), or the `'a'` fallback. | `LinkContext`, `useLink`, `LinkComponent`, `LinkContextValue` |
| `option` | Selectable list-item primitive for select-like widgets: option row, label, description, a text slot that stacks the label over the description, and a factory that binds them to a host's selection hook. The hook throws a named error outside its host. | `Option`, `OptionLabel`, `OptionText`, `OptionDescription`, `createSelectOption`, `OptionSelectionContext` |
| `select-trigger` | Presentational trigger chrome for the select family (Listbox, Combobox); wraps `ControlFrame`, and each affix slot is a scope one step below the trigger. | `SelectTrigger`, `SelectTriggerProps` |
| `virtual-options` | Windowed option list (TanStack virtualizer) for `PopoverPanel` listboxes. It renders viewport and overscan rows with top/bottom spacers and `aria-setsize`/`aria-posinset`. An optional item source reaches options outside the window for the keyboard. | `VirtualOptions`, `VirtualOptionMeta` |

## Styling & state context cascades

| Primitive | Summary | Key exports |
|---|---|---|
| `density` | The density context: one `DensityStep`, the same value as the `data-density` attribute of the nearest scope. `Density` opens a scope; `useDensityStep` resolves explicit → scope → the step on the root element (`md` on the server). `useDensityScope` returns the nearest scope under the root, or `null`. A control slot writes `data-density="slot"`, a scope one step below its host in CSS only, so a panel that the slot opens takes the step of the host. The `density` prop of `PolymorphicStatic` and Box opens both halves of a scope. | `Density`, `useDensityStep`, `useDensityScope` |
| `control` | Outer chrome wrapper supplying the shared focus ring, border, and disabled state for form inputs. Its radius takes the step of the nearest density scope through stepped classes, and its `density` prop, a `ControlStep`, makes the frame a density scope. | `ControlFrame` |
| `mount` | The shared hold behind every inactive panel. `useMountHold` resolves a `Mount` policy (`always`/`lazy`/`active`) into present, held, and hidden; `MountHold` applies it through `<Activity>`. The deep-import module `mount/mount-held-motion` gives Accordion and Collapse the motion props of a held panel, `heldMotionProps`. | `useMountHold`, `MountHold`, `Mount`, `MountHoldState`, `mountsEveryPanel` |
| `current` | Shared active-panel cascade for Tabs/Nav: the active value, the inactive-panel `mount` policy, and the auto-height fade between panels. The outgoing panel goes at once, and the incoming panel fades in. Presence and the Activity hold come from `primitives/mount`. | `CurrentContext`, `useCurrent`, `useCurrentState`, `useCurrentPanelActive`, `CurrentContent`, `CurrentContents`, `CurrentMount` |
| `query` | Query context for type-ahead roots (Combobox, CommandPalette): shares live + deferred query text, and the deferred query alone for a consumer that filters items. | `QueryContext`, `useQuery`, `useQueryValue`, `QueryContextValue`, `DeferredQueryContext`, `useDeferredQuery` |
| `active-indicator` | Motion shared-element marker that morphs between sibling nav/tab items via a scoped `layoutId`. | `ActiveIndicatorScope`, `useActiveIndicator`, `ActiveIndicator` |
| `content-height` | Context of a box that can take the height of its content, such as a dashboard tile in the re-pack of a narrow board. A widget that scrolls in a box of fixed height can claim the height of its content, so the page has no scroll region inside a scroll region. `Grid` claims it for its default pages. | `ContentHeightContext`, `useContentHeightHost`, `ContentHeightHost` |
| `header-actions` | Context of the element in the header row of a box, such as a dashboard tile, where a widget in the box can put its own controls with a portal. The control then sits next to the controls of the box and covers none of the widget. `Chart` puts its touch menu button there. | `HeaderActionsContext`, `useHeaderActionsHost`, `createHeaderActionsHost`, `HeaderActionsSlot`, `HeaderActionsHost` |
| `toggle` | Layout primitives for toggle/switch fields: a group container and a single control-plus-label row, driven by the shared toggle recipe. | `ToggleGroup`, `ToggleField` |

## Motion & hit area

| Primitive | Summary | Key exports |
|---|---|---|
| `reduced-motion` | Bridges `prefers-reduced-motion` into Motion via `MotionConfig`; skips transform animations while keeping fades at every library motion root. A root inside another root adds no second `MotionConfig`. | `ReducedMotion` |
| `touch-target` | Floors the hit target to WCAG pointer minimums (24px fine / 44px coarse) via an invisible expansion sibling, without altering visual layout. A container of small hosts sets `--touch-target-gap-x` (a row) or `--touch-target-gap-y` (a stack) to its gap, so adjacent hit areas split the gap at the midpoint and do not overlap. | `TouchTarget` |

---

**See also:** [`COMPONENTS.md`](COMPONENTS.md) · [`HOOKS.md`](HOOKS.md) · [`PROVIDERS.md`](PROVIDERS.md) · [`CORE.md`](CORE.md) · [`../REFERENCE.md`](../REFERENCE.md). Keep this current per [`CONVENTIONS.md` §12](../../../CONVENTIONS.md).
