# Primitives

> **Quick-glance index of `ui/primitives/*`.** Primitives are the composable building blocks components share: the floating and overlay shells, polymorphic link/element resolution, the styling-context cascades, and the accessibility and interaction helpers. Each is its own entry point; components reach most of them indirectly, and apps rarely reach one directly. Full signatures and caveats live in each primitive's TSDoc.

```ts
import { Polymorphic } from 'ui/primitives/polymorphic'
import { TouchTarget } from 'ui/primitives/touch-target'
```

## Floating, overlay & portal surfaces

| Primitive | Summary | Key exports |
|---|---|---|
| `floating-surface` | Positioning shell over a `Portal` that Tooltip, Popover, and Menu share, with an optional focus trap. | `FloatingSurface` |
| `overlay` | Backdrop-and-panel shell for modal surfaces (Dialog, Sheet, Drawer) over a `Portal`: focus trap, scroll lock, dismissal, and scrim. The scroll lock holds until the exit completes. A `Chrome` region stays reachable unless `coverChrome` is set. A modal overlay hides each float anchored under it. With a `container`, the focus that moves into a sliding panel does not scroll the container. | `Overlay`, `notifyOverlaySignal`, `subscribeOverlaySignal` |
| `chrome` | Marks a region as application chrome that no modal surface can seal off. Registration is by node, so no surface takes a prop. | `Chrome`, `chromeRegions` |
| `popover` | Animated listbox-style floating panel (Select, Combobox, Menu) with roving keyboard nav, type-ahead, and open autofocus. | `PopoverPanel`, `PopoverPanelProps` |
| `panel` | Slot family and context envelope for panel surfaces. `createPanel` builds the slots, and `PanelRoot` holds the open state that `usePanelState` reads. The deep-import module `panel/panel-handle` gives the resize grip, and `panel/use-panel-surface` gives the overlay, motion, naming, and glass wiring that Dialog, Sheet, and Drawer share. | `createPanel`, `PanelProviders`, `PanelRoot`, `usePanelState`, `PanelClose`, `PanelTrigger`, `usePanelA11y`, `usePanelCloseContext`, `PanelCloseContext` |
| `offcanvas` | React context exposing a `close()` handle so descendants can dismiss the surrounding slide-in drawer. | `OffcanvasContext` |
| `portal` | Resolves where library UI teleports, and adds `Portal`, the cell that the floating and overlay shells share. A portaled surface keeps the density and direction scopes of the place that opened it. | `usePortalContainer`, `usePortalContext`, `PortalContext`, `PortalContainer`, `Portal` |
| `ready-reveal` | Gates content on a ready flag and cross-fades a placeholder to the children with no layout shift. | `ReadyReveal` |

## Composition & polymorphism

| Primitive | Summary | Key exports |
|---|---|---|
| `polymorphic` | Renders the registered router link when `href` is present, and the `as` element otherwise. | `Polymorphic`, `PolymorphicStatic`, `PolymorphicProps`, `PolymorphicStaticProps` |
| `landmark` | A landmark of a page that changes inside the main landmark of another layout. `Landmark` with `as="main"` renders a `<main>`, or a `<div>` inside another main. With `as="section"`, it renders a region, or a `<section>` with no name inside a main. Thus a layout in the main slot of another layout adds no second main and no second region with one name. `useLandmark` tells which landmark holds the caller. | `Landmark`, `LandmarkProps`, `useLandmark` |
| `link` | Link context exposing the framework link component an app registers (e.g. `next/link`), or the `'a'` fallback. | `LinkContext`, `useLink`, `LinkComponent`, `LinkContextValue` |
| `option` | Selectable list-item primitive for select-like widgets. `createSelectOption` makes the option row and its slots. | `createSelectOption`, `OptionSelectionContext` |
| `select-trigger` | Trigger chrome for the select family (Listbox, Combobox) over `ControlFrame`. | `SelectTrigger`, `SelectTriggerProps` |
| `inline-script` | Internal, with no entry point. A `<script>` that runs before React hydrates. `AppearanceScript` and the fit of a collapsing `Breadcrumb` render it. | `InlineScript` (`@internal`) |
| `sortable-grip` | Internal, with no entry point. The drag grip of a sortable item, and the only part of the item that starts a drag. The Kanban, Dashboard, Grid, and QueryBuilder grips render it. | `SortableGrip` (`@internal`) |
| `splitter` | Internal, with no entry point. A focusable window splitter: an `<hr>` with a tab stop, and a name, an orientation, and a value that its props require. The Resizable, Grid column, Dashboard, drawer, and sheet resize handles render it, and draw the grip as its `::after`. | `Splitter` (`@internal`) |
| `trigger-child` | Internal, with no entry point. Clones the single element child of a trigger, and merges the other props of the trigger into the props of the child. `disclosureProps` gives the open-state attributes that `PopoverTrigger`, `MenuTrigger`, and `PanelTrigger` stamp. `PopoverTrigger`, `MenuTrigger`, `TooltipTrigger`, and `PanelTrigger` use it. | `TriggerChild`, `triggerChild`, `mergeTriggerProps`, `disclosureProps` (`@internal`) |
| `virtual-options` | Windowed option list (TanStack virtualizer) for `PopoverPanel` listboxes and the `CommandPalette` list. | `VirtualOptions`, `VirtualOptionMeta` |

## Styling & state context cascades

| Primitive | Summary | Key exports |
|---|---|---|
| `density` | The density context: one `DensityStep`, the same value as the `data-density` of the nearest scope. `Density` opens a scope, and `useDensityStep` resolves the step. A control slot is a scope one step below its host, in CSS only, and no step is below `xs`. A panel that the slot opens takes the step of the host, and in the slot `useDensityStep` gives the step of the host. | `Density`, `useDensityStep`, `useDensityScope` |
| `direction` | The direction context. `Direction` opens a scope in context only, and `LocaleProvider` `dir` also writes the attribute. A portal cannot see a raw `dir` attribute. | `Direction`, `useDirectionScope`, `TextDirection` |
| `intl` | The messages of ui, and of each app or package that uses the mechanism. `useIntl` reads the intl of the nearest `LocaleProvider`, and an English intl outside each provider. `IntlMessage` shows one message from a module with no `'use client'`. An app or a package defines its messages with `defineMessages`, and gives their translations to `LocaleProvider` as `catalogs` (`IntlCatalogs`), merged over the catalogs of ui. It is the one module that imports FormatJS. A unit of ui imports the files of the primitive: `defineMessages` from `intl-messages`, and the intl types from `types`. It also holds the catalogs of ui, the messages that many controls share, and the messages of a reorder with the builders that format them. Its other exports are `@internal`. | `useIntl`, `IntlMessage`, `IntlMessageProps`, `defineMessages`, `defineMessage`, `MessageSet`, `IntlCatalogs`, `IntlShape`, `MessageDescriptor`, `TypedMessageDescriptor` |
| `control` | The frame of a form control, the element that draws the focus ring, the border, and the disabled state. The frame has no classes of its own: each control gives it the `base` slot of its unit. Under `HeadlessProvider` it renders its children alone. | `ControlFrame` |
| `mount` | The shared hold behind each inactive panel: `useMountHold` resolves a `Mount` policy, and `MountHold` applies it through `<Activity>`. A trigger asks `useMountsEveryPanel` whether `aria-controls` can name a closed panel. The deep-import module `mount/mount-held-motion` gives Accordion and Collapse the motion of a held panel. | `useMountHold`, `MountHold`, `Mount`, `MountHoldState`, `useMountsEveryPanel` |
| `current` | Shared active-panel cascade for Tabs and Nav: the active value, the `mount` policy, and the `animate` style of a switch. | `CurrentContext`, `useCurrent`, `useCurrentState`, `CurrentContent`, `CurrentContents` |
| `form` | Internal, with no entry point. The form-binding contract that each bindable control reads. It holds the store and the actions of a form, and the slice hooks of a field and of the status. It also holds the binding cascade (`useFormValue`, `useFormToggle`), and the lock that refuses a field write while a submit runs. `Form` and `FormFilters` of the `form` module provide it ([`MODULES.md`](MODULES.md)), and the `form` barrel re-exports its public hooks. The read-only state of a locked field comes from the lock scope of Control, which `Form` also renders. | `FormProvider`, `useFormField`, `useFormStatus`, `useFormActions`, `useFormContext`, `useFormValue`, `useFormToggle`, `hasIssues` (`FormProvider`, `useFormToggle`, and `hasIssues` are `@internal`) |
| `query` | Query context for type-ahead roots (Combobox, CommandPalette). A consumer that filters items reads the deferred query alone. | `QueryContext`, `useQuery`, `useQueryValue`, `QueryContextValue`, `DeferredQueryContext`, `useDeferredQuery` |
| `active-indicator` | Motion shared-element marker that morphs between sibling nav/tab items via a scoped `layoutId`. | `ActiveIndicatorScope`, `useActiveIndicator`, `ActiveIndicator`, `ActiveIndicatorProps`, `ActiveIndicatorScopeProps` |
| `content-height` | Context of a box that can take the height of its content, such as a dashboard tile. A widget that scrolls can claim it, so the page has no nested scroll region. `Grid` claims it for its default pages. The box gives a read and a subscription, so its context value does not change when the box becomes available. | `ContentHeightContext`, `useContentHeightHost`, `useContentHeightAvailable`, `ContentHeightHost` |
| `header-actions` | A box with a header row where a widget can portal its own controls, such as a dashboard tile. `Chart` puts its View data button there, and its touch menu button when it shows one. | `HeaderActions`, `HeaderActionsSlot`, `useHeaderActions` |
| `toggle` | Layout primitives for toggle/switch fields: a group container and a single control-plus-label row, driven by the shared toggle recipe. | `ToggleGroup`, `ToggleField` |

## Motion & hit area

| Primitive | Summary | Key exports |
|---|---|---|
| `reduced-motion` | The root of each library part that animates with Motion. It loads the Motion features in a chunk, and bridges reduced motion into `MotionConfig`. An HTML `m` element of `reduced-motion-elements` is `inert` while it exits under `AnimatePresence`. | `ReducedMotion` |
| `touch-target` | Floors the hit target to WCAG pointer minimums (24px fine / 44px coarse) with no change to the layout. A container of small hosts sets `--touch-target-gap-x` or `--touch-target-gap-y` to its gap. | `TouchTarget` |

---

**See also:** [`COMPONENTS.md`](COMPONENTS.md) · [`HOOKS.md`](HOOKS.md) · [`PROVIDERS.md`](PROVIDERS.md) · [`CORE.md`](CORE.md) · [`../REFERENCE.md`](../REFERENCE.md). Keep this current per [`CONVENTIONS.md` §12](../../../CONVENTIONS.md).
