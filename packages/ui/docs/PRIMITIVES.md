# Primitives

> **Quick-glance index of `ui/primitives/*`.** Primitives are the composable building blocks components share: the floating and overlay shells, polymorphic link/element resolution, the styling-context cascades, and the accessibility and interaction helpers. Each is its own entry point; components reach most of them indirectly, and apps rarely reach one directly. Full signatures and caveats live in each primitive's TSDoc.

```ts
import { Polymorphic } from 'ui/primitives/polymorphic'
import { TouchTarget } from 'ui/primitives/touch-target'
```

## Floating, overlay & portal surfaces

| Primitive | Summary | Key exports |
|---|---|---|
| `floating-surface` | Positioning shell shared by Tooltip, Popover, and Menu; owns the positioned wrapper and optional focus trap over a `PresencePortal`. | `FloatingSurface` |
| `overlay` | Backdrop-and-panel shell for modal surfaces (Dialog, Sheet, Drawer) over a `PresencePortal`: focus trap, scroll lock, dismissal, dimming scrim. `reachable` names outside chrome that keeps its tab stop while the surface is up, for a long-lived work surface the trap would otherwise seal the user into; `elevated` is its inverse, for a surface that must paint over chrome the app lifted above the overlay root. | `Overlay`, `OverlayReach`, `notifyOverlaySignal`, `subscribeOverlaySignal` |
| `popover` | Animated listbox-style floating panel (Select, Combobox, Menu) wiring roving keyboard nav, type-ahead, and open autofocus. | `PopoverPanel` |
| `panel` | Slot family + context envelope for panel surfaces; `createPanel` builds Title/Description/Header/Body/Footer/Content with Close and A11y contexts. | `createPanel`, `PanelProviders`, `PanelClose`, `PanelTrigger`, `usePanelA11y`, `usePanelCloseContext` |
| `offcanvas` | React context exposing a `close()` handle so descendants can dismiss the surrounding slide-in drawer. | `OffcanvasContext` |
| `portal` | Portal-container context that resolves where library UI teleports: per-call container, then ambient `UIProvider`, then each portal's fallback. Adds `PresencePortal`, the portal + mount-while-open + `AnimatePresence` cell the floating and overlay shells share. | `usePortalContainer`, `usePortalContext`, `PortalContext`, `PortalContainer`, `PresencePortal` |
| `ready-reveal` | Gates content on a ready flag and cross-fades a placeholder to the children in one grid cell, so nothing flashes and the reveal never shifts. | `ReadyReveal` |

## Composition & polymorphism

| Primitive | Summary | Key exports |
|---|---|---|
| `polymorphic` | `href`-driven link switch with element polymorphism: renders the registered router link when `href` is present, the `as` element otherwise. | `Polymorphic`, `PolymorphicStatic`, `PolymorphicProps`, `PolymorphicStaticProps` |
| `link` | Link context exposing the framework link component an app registers (e.g. `next/link`), or the `'a'` fallback. | `LinkContext`, `useLink`, `LinkComponent`, `LinkContextValue` |
| `option` | Selectable list-item primitive for select-like widgets: option row, label, description, and a factory binding them to a host's selection context. | `BaseOption`, `OptionLabel`, `OptionDescription`, `createSelectOption`, `OptionSelectionContext` |
| `select-trigger` | Presentational trigger chrome for the select family (Listbox, Combobox); wraps `ControlFrame` and steps Affix down for the chevron. | `SelectTrigger`, `SelectTriggerProps` |
| `virtual-options` | Windowed option list (TanStack virtualizer) for `PopoverPanel` listboxes. It renders viewport and overscan rows with top/bottom spacers and `aria-setsize`/`aria-posinset`. An optional item source reaches options outside the window for the keyboard. | `VirtualOptions`, `VirtualOptionMeta` |

## Styling & state context cascades

| Primitive | Summary | Key exports |
|---|---|---|
| `density` | Dual-axis (space/size) density token broadcast by `Density`; resolvers cascade explicit → Affix → ambient for leaf and control-host sizing. | `Density`, `useDensity`, `useDensityNullable`, `useResolvedSize`, `useControlSize`, `densityPresets` |
| `affix` | Narrow `Ma`-typed slot cascade letting control affix slots (Input prefix/suffix, chevron) broadcast a stepped-down size below the Density `Step` floor. | `AffixContext`, `useAffix`, `affixStepDown` |
| `control` | Outer chrome wrapper supplying the shared focus ring, border, and disabled state for form inputs, sized via Density. | `ControlFrame` |
| `mount` | The shared hold behind every inactive panel. `useMountHold` resolves a `Mount` policy (`always`/`lazy`/`active`) into present, held, and hidden; `Hold` applies it through `<Activity>`. | `useMountHold`, `Hold`, `Mount`, `MountHold`, `mountsEveryPanel` |
| `current` | Shared active-panel cascade for Tabs/Nav: the active value, the inactive-panel `mount` policy, and the auto-height cross-fade between panels. Presence and the Activity hold come from `primitives/mount`. | `CurrentContext`, `useCurrent`, `useCurrentState`, `useCurrentPanelActive`, `CurrentContent`, `CurrentContents`, `CurrentMount` |
| `query` | Query context for type-ahead roots (Combobox, CommandPalette): shares live + deferred query text; descendants read it to filter items. | `QueryContext`, `useQuery`, `useQueryValue`, `QueryContextValue` |
| `active-indicator` | Motion shared-element marker that morphs between sibling nav/tab items via a scoped `layoutId`. | `ActiveIndicatorScope`, `useActiveIndicator`, `ActiveIndicator` |
| `toggle` | Layout primitives for toggle/switch fields: a group container and a single control-plus-label row, driven by the shared toggle recipe. | `ToggleGroup`, `ToggleField` |

## Motion & hit area

| Primitive | Summary | Key exports |
|---|---|---|
| `reduced-motion` | Bridges `prefers-reduced-motion` into Motion via `MotionConfig`; skips transform animations while keeping fades at every library motion root. | `ReducedMotion` |
| `touch-target` | Floors the hit target to WCAG pointer minimums (24px fine / 44px coarse) via an invisible expansion sibling, without altering visual layout. | `TouchTarget` |

---

**See also:** [`COMPONENTS.md`](COMPONENTS.md) · [`HOOKS.md`](HOOKS.md) · [`PROVIDERS.md`](PROVIDERS.md) · [`CORE.md`](CORE.md) · [`../REFERENCE.md`](../REFERENCE.md). Keep this current per [`CONVENTIONS.md` §12](../../../CONVENTIONS.md).
