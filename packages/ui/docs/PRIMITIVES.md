# Primitives

> **Quick-glance index of `ui/primitives/*`.** Primitives are the composable building blocks components share — floating/overlay shells, polymorphic link/element resolution, the styling-context cascades (density, affix, control, join), and accessibility/interaction helpers. Each is its own entry point; many are consumed indirectly by components rather than directly by apps. Full signatures and caveats live in each primitive's TSDoc.

```ts
import { Polymorphic } from 'ui/primitives/polymorphic'
import { TouchTarget } from 'ui/primitives/touch-target'
```

## Floating, overlay & portal surfaces

| Primitive | Summary | Key exports |
|---|---|---|
| `floating-surface` | Portal + presence + positioning shell shared by Tooltip, Popover, and Menu; owns `FloatingPortal`, `AnimatePresence`, and optional focus trap. | `FloatingSurface` |
| `overlay` | Portalled backdrop-and-panel shell for modal surfaces (Dialog, Sheet, Drawer): focus trap, scroll lock, dismissal, dimming scrim. | `Overlay`, `notifyOverlaySignal`, `subscribeOverlaySignal` |
| `popover` | Animated listbox-style floating panel (Select, Combobox, Menu) wiring roving keyboard nav, type-ahead, and open autofocus. | `PopoverPanel` |
| `panel` | Slot family + context envelope for panel surfaces; `createPanel` builds Title/Description/Header/Body/Footer/Content with Close and A11y contexts. | `createPanel`, `PanelProviders`, `PanelClose`, `PanelTrigger` |
| `offcanvas` | React context exposing a `close()` handle so descendants can dismiss the surrounding slide-in drawer. | `OffcanvasContext` |
| `portal` | Portal-container context resolving where library UI teleports: per-call container, then ambient `UIProvider`, then each portal's fallback. | `usePortalContainer`, `PortalContext` |
| `ready-reveal` | Gates content on a ready flag, crossfading placeholder→children in a shared grid cell (inert/`aria-hidden`, ReducedMotion) to avoid a flash of unready content. | `ReadyReveal` |

## Composition & polymorphism

| Primitive | Summary | Key exports |
|---|---|---|
| `polymorphic` | `href`-driven link switch with element polymorphism: renders the registered router link when `href` is present, the `as` element otherwise. | `Polymorphic`, `PolymorphicStatic`, `PolymorphicProps`, `PolymorphicStaticProps` |
| `link` | Link context exposing the framework link component an app registers (e.g. `next/link`), or the `'a'` fallback. | `LinkContext`, `useLink`, `LinkComponent` |
| `option` | Selectable list-item primitive for select-like widgets: option row, label, description, and a factory binding them to a host's selection context. | `BaseOption`, `OptionLabel`, `OptionDescription`, `createSelectOption` |
| `select-trigger` | Presentational trigger chrome for the select family (Listbox, Combobox); wraps `ControlFrame` and steps Affix down for the chevron. | `SelectTrigger` |
| `virtual-options` | Windowed option list (TanStack virtualizer) for `PopoverPanel` listboxes; renders viewport + overscan rows with top/bottom spacers. | `VirtualOptions` |

## Styling & state context cascades

| Primitive | Summary | Key exports |
|---|---|---|
| `density` | Dual-axis (space/size) density token broadcast by `Density`; resolvers cascade explicit → Affix → ambient for leaf and control-host sizing. | `Density`, `useDensity`, `useResolvedSize`, `useControlSize` |
| `affix` | Narrow `Ma`-typed slot cascade letting control affix slots (Input prefix/suffix, chevron) broadcast a stepped-down size below the Density `Step` floor. | `AffixContext`, `useAffix`, `affixStepDown` |
| `control` | Outer chrome wrapper supplying the shared focus ring, border, and disabled state for form inputs, sized via Density. | `ControlFrame` |
| `current` | Shared active-panel cascade for Tabs/Nav; the container rests at auto height and animates it only across discrete changes — a panel switch, or content growing at constant width — so a window resize reflows it without re-rendering, and its `mount` policy either keeps inactive panels mounted (opacity cross-fade, or held via `<Activity mode="hidden">` with effects paused), lazily mounts them on first activation, or unmounts them on value match. Under a fading container the lifecycle edges ride the cross-fade: late-mounting panels enter from transparent and an `active` outgoing panel unmounts only after its fade-out completes. `useCurrentPanelActive` folds the active match across nesting so descendants know they are on the panel in view. | `CurrentContext`, `useCurrent`, `useCurrentPanelActive`, `CurrentContent`, `CurrentContents`, `CurrentMount` |
| `query` | Query context for type-ahead roots (Combobox, CommandPalette): shares live + deferred query text; descendants read it to filter items. | `QueryContext`, `useQuery`, `useQueryValue` |
| `active-indicator` | Motion shared-element marker that morphs between sibling nav/tab items via a scoped `layoutId`. | `ActiveIndicatorScope`, `useActiveIndicator`, `ActiveIndicator` |
| `toggle` | Layout primitives for toggle/switch fields: a group container and a single control-plus-label row, driven by the shared toggle recipe. | `ToggleGroup`, `ToggleField` |

## Motion & hit area

| Primitive | Summary | Key exports |
|---|---|---|
| `reduced-motion` | Bridges `prefers-reduced-motion` into Motion via `MotionConfig`; skips transform animations while keeping fades at every library motion root. | `ReducedMotion` |
| `touch-target` | Floors the hit target to WCAG pointer minimums (24px fine / 44px coarse) via an invisible expansion sibling, without altering visual layout. | `TouchTarget` |

---

**See also:** [`COMPONENTS.md`](COMPONENTS.md) · [`HOOKS.md`](HOOKS.md) · [`PROVIDERS.md`](PROVIDERS.md) · [`CORE.md`](CORE.md) · [`../REFERENCE.md`](../REFERENCE.md). Keep this current per [`CONVENTIONS.md` §12](../../../CONVENTIONS.md).
