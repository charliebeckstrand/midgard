# Hooks

> **Quick-glance index of `ui/hooks`.** Shared behavioral hooks — state, floating/overlay wiring, interaction, accessibility, measurement, drag-and-drop, and formatted input. The `a11y/` family layers atop `useA11yScope`. All are client-only (`'use client'`), which the `require-client-directive-in-hooks` Biome plugin pins. Full signatures and caveats live in each hook's TSDoc.

```ts
import { useControllable, useA11yScope } from 'ui/hooks'
```

## State

| Hook | Summary |
|---|---|
| `useControllable` | Holds a controlled or uncontrolled value with one setter, and reports only a change. |
| `useControllableFlag` | The boolean form of `useControllable` for `open`, `pressed`, or `checked`. The value is never `undefined`. |
| `useDeferredToggle` | Listbox/Combobox toggle logic; freezes the rendered selection through the panel's close animation. |
| `useSelectableValueChange` | Wraps `onValueChange` to drop the "cleared to undefined" event in multi-select mode. |
| `useIdleLoad` | Loads a value, such as the module of a menu, in idle time after the mount. The mounts of one loader share one load. |
| `useIntentLoad` | `useIdleLoad` that also loads on a pointer, a focus, or a press, for a trigger that loads its code first. |
| `useTimeout` | One restartable timer with stable `set`, `clear`, and `pending`, for a debounce or a dwell delay. It clears on unmount. |
| `useOffcanvas` | Open state of an offcanvas panel, which closes when its `layout` turns `inline` (by default from `lg`). |

## Floating & overlays

| Hook | Summary |
|---|---|
| `useFloatingPanel` | Base floating-panel hook: `useFloating` with autoUpdate and the standard offset, flip, shift, size, and hide middleware. It keeps the panel in the viewport. |
| `useFloatingUI` | Floating panel with built-in dismiss + role prop-getters for listbox/combobox/menu/datepicker surfaces. |
| `useFloatingDisclosure` | Disclosure wrapper over `useFloatingPanel`: controllable open state, trigger ref, focus restore, dismiss + role. |
| `useDismissable` | Overlay dismiss behavior: Escape (via the dismiss-layer stack) plus pointer-down outside the boundary, sparing a floating surface opened from within it. |
| `useEscapeLayer` | Escape-key dismissal routed through the shared dismiss-layer stack; stacked surfaces close innermost-first. |
| `useScrollLock` | Locks body overflow while active; nested locks reference-counted, scrollbar gap compensated. |

## Interaction

| Hook | Summary |
|---|---|
| `useKeybindings` | Subscribes to tinykeys keybindings for the component's lifetime, reading handlers fresh per event. |
| `useHasHover` | True when the device has a hover-capable pointer; true during SSR. |
| `useKeyboardLifted` | Lifted-item state for keyboard reordering, which announces the lift and the drop. The lift drops when the surface turns disabled. |
| `useKeyboardSettled` | Defers a callback until the virtual keyboard settles; fires immediately on desktop. |
| `useHoverAcrossScroll` | Hides a chart/map tooltip while scrolling and recomputes hover at the pointer once the scroll settles. |

## Accessibility

| Hook | Summary |
|---|---|
| `useA11yScope` | Universal a11y scope: stable id plus slot-driven `aria-labelledby`/`describedby` from only mounted slots. |
| `useA11yControl` | Field a11y scaffolding: `useA11yScope` specialized for a labeled control (label/description/error slots). |
| `useA11yPanel` | Modal-panel labeling scope: `useA11yScope` for dialog roots, setting role + `aria-modal` and title/desc ids. |
| `useA11yDisclosure` | Non-modal trigger↔panel pairing: reciprocal `aria-controls`/`aria-labelledby` (+ optional `aria-expanded`). |
| `useA11yRoving` | Arrow, Home, and End roving over container items, in focus or virtual mode, with one Tab stop. Horizontal arrows swap in RTL. A key skips an item under an `inert` ancestor. Optional type-ahead matches the typed text to the start of the name of an item. The name is its `aria-label`, else its `aria-labelledby` text, else its own text. |
| `useA11yAutoFocus` | Moves focus to a node from a callback ref when `when` becomes true. The focus scrolls nothing. |
| `useA11yHasTabbable` | Whether a node holds a tab-order descendant, measured again when its subtree changes. |
| `useA11yLiveRegion` | Props for a consumer-filled live region: status/alert landmark with matching `aria-live`/`aria-atomic`. |
| `useA11yAnnouncements` | Sends a changing status string to the live-region announcer. It skips the initial value and consecutive duplicates. |
| `useAriaIds` | Composes the space-separated id list for `aria-labelledby`/`describedby`; falsy tokens drop, undefined if empty. |
| `useIdScope` | Stable scoped id plus a `sub(suffix)` deriver for related ids; falls back to a `useId` base. |

## Measurement & layout

| Hook | Summary |
|---|---|
| `useResizeObserver` | Calls `callback` on each size change of `ref.current`, and one time on attach. |
| `usePlotFrame` | Resolves the drawing box of a chart or map frame from a `FrameSizing` policy, and measures only the axes that the policy uses. |
| `useMediaQuery` | True when `query` matches the viewport; true during SSR. |
| `usePrefersReducedMotion` | True when the reader asks for reduced motion through the platform or `AppearanceProvider`; true during SSR. Use it in place of the `useReducedMotion` of motion. |
| `useResponsiveValue` | The value of a `Responsive<T>` prop at the viewport, as its classes give it. During SSR, the value of the largest breakpoint. |
| `useIsTruncated` | True when text overflows the element, measured with a `Range` over its contents. |
| `useScrollRegion` | Callback ref that makes a scroll container a tab stop while its content overflows. A `label` also makes it a named `region`. |
| `useScrollWithin` | Returns a function that scrolls a node into view in its nearest scrollable ancestor. |
| `useVirtualWindow` | Drives a vertical windowed list from a `@tanstack/virtual-core` virtualizer, over uniform or measured rows. It gives the visible items and the spacer heights. |

## Drag & drop

| Hook | Summary |
|---|---|
| `useSortableList` | Single-list reorder backed by @dnd-kit: owns the drag lifecycle and commits via `arrayMove`. |
| `useSortableItem` | Wraps the `useSortable` of dnd-kit with the standard drag style. Under reduced motion the style has no transition. |
| `useSortableSensors` | The standard dnd-kit sensors: a pointer sensor with a low threshold, and a keyboard sensor on the arrow keys. |
| `useDragCursor` | Holds a drag cursor on the whole page while active. Each drag in the library uses it, and `drag-cursor-boundary.test.ts` holds that rule. |

## Formatting & input

| Hook | Summary |
|---|---|
| `useFormattedInput` | Caret-preserving reformat engine for formatted inputs; core under `useMaskInput` / `CurrencyInput`. |
| `usePendingCaret` | Queues a caret restore against the formatted value while the input has focus. |

## Exported types

Hooks export the option and return shapes consumers thread through their own props:

| Type | Summary |
|---|---|
| `A11yScope` / `A11yScopeOptions` | Return shape / options of `useA11yScope` (id, `sub`, per-slot ids/registrars, composed `ariaProps`). |
| `A11yRelation` | Which ARIA relation a slot's id feeds: `'labelledby' \| 'describedby'`. |
| `A11yControl` | Return shape of `useA11yControl`: composed `describedBy`/`labelledBy`, slot ids, registrars. |
| `A11yPanel` / `A11yPanelProviderValue` / `A11yPanelRole` | `useA11yPanel` return, its provider value, and the dialog-root role (`'dialog' \| 'alertdialog'`). |
| `A11yDisclosure` / `A11yDisclosureOptions` | Return shape / options of `useA11yDisclosure` (trigger/panel ids and prop bags). |
| `A11yLiveRegionProps` / `A11yLiveRegionOptions` / `A11yLiveLevel` | Live-region props, options, and urgency (`'polite' \| 'assertive'`). |
| `A11yAnnouncementsOptions` | Options for `useA11yAnnouncements` (`assertive`, `enabled`). |
| `Timeout` | Return shape of `useTimeout`: `set`, `clear`, `pending`. |
| `IntentLoad` | Return shape of `useIntentLoad`: `module`, `request`, `preload`. |
| `SetValue` | Argument to `useControllable`'s setter: a next value, `null`/`undefined` to clear, or a functional updater. |
| `Responsive` | A single value or a per-breakpoint map, the type that `useResponsiveValue` takes. |
| `RovingOptions` | Options for `useA11yRoving`. |
| `ControllableOptions` | Options for `useControllable`: the controlled `value`, the uncontrolled `defaultValue`, and the change report. |
| `ControllableFlagOptions` | Options for `useControllableFlag`: the controlled flag, the uncontrolled default (`false`), and the change report. |
| `DeferredToggleOptions` | Options for `useDeferredToggle`. |
| `DismissableOptions` | Options for `useDismissable`: the boundary, the dismiss report, and the enable gate. |
| `EscapeLayerOptions` | Options for `useEscapeLayer`: where the layer sits in the stack and what a press does. |
| `FloatingDisclosureOptions` / `FloatingDisclosureResult` | Options and return shape of `useFloatingDisclosure`. |
| `FloatingUIOptions` / `FloatingUIResult` | Options and return shape of `useFloatingUI`. |
| `FloatingHeightSnap` | A function that lowers the `fitHeight` cap of `useFloatingPanel` to a height that suits the content. |
| `FloatingPanelOptions` / `FloatingPanelResult` | Options and return shape of `useFloatingPanel`. |
| `FloatingPlacement` | A floating-ui placement, or `<side>-auto`, which aligns the panel to the edge that is nearer to the reference. |
| `FormattedInputOptions` | Options for `useFormattedInput`: the `format` pass, the meaningful-character test, and the ref to compose. |
| `IdScopeOptions` | Options for `useIdScope`: the id to adopt in place of a generated one. |
| `KeybindingsOptions` | Options for `useKeybindings`: the enable gate, the target, the capture phase, and the skip predicate. |
| `OffcanvasOptions` | Options for `useOffcanvas`: the `layout` and the change report. |
| `OffcanvasLayout` | Where an offcanvas panel is: `drawer` or `inline`. `OFFCANVAS_LAYOUT` is the default, the `layout` that `SidebarLayout` and `DashboardLayout` take. |
| `ScrollRegionOptions` | Options for `useScrollRegion`: the `label` or `labelledBy` that names the region while it scrolls. |
| `ScrollWithinOptions` | Options for `useScrollWithin`. |
| `SortableItemOptions` / `SortableListOptions` / `SortableSensorsOptions` | Options for the `@dnd-kit` wrappers. |
| `DragCursor` | The cursors that `useDragCursor` can hold. |
| `VirtualWindowOptions` / `MeasuredVirtualWindowOptions` | Options for `useVirtualWindow`, over uniform rows or measured rows. |

`usePlotFrame` exports the types its own signature names: the sizing policy it takes, the reserve it returns, and its measuring handle. The chart and map modules share them with their frame-sizing helpers. The resolver behind it (`resolveFrameSizing`) and that resolver's return shape stay module-private. Reach them at `hooks/use-plot-frame` from inside the package.

| Type | Summary |
|---|---|
| `FrameSizing` | The frame's height policy: `fixed` (pixel height), `aspect` (ratio of width), `fill` (container height), or `content` (width minus a pair of margins). |
| `FrameReserve` | How a width-derived frame reserves its height through CSS: an `aspect` ratio, or a `content` ratio with a fixed pixel offset. |
| `PlotFrameRef` | The measuring handle of the hook: a callback ref that is also readable through `.current`. |

---

**See also:** [`COMPONENTS.md`](COMPONENTS.md) · [`PRIMITIVES.md`](PRIMITIVES.md) · [`CORE.md`](CORE.md) · [`../REFERENCE.md`](../REFERENCE.md). Keep this current per [`CONVENTIONS.md` §12](../../../CONVENTIONS.md).
