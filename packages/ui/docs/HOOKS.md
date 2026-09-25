# Hooks

> **Quick-glance index of `ui/hooks`.** Shared behavioral hooks — state, floating/overlay wiring, interaction, accessibility, measurement, drag-and-drop, and formatted input. The `a11y/` family layers atop `useA11yScope`. All are client-only (`'use client'`), which the `require-client-directive-in-hooks` Biome plugin pins. Full signatures and caveats live in each hook's TSDoc.

```ts
import { useControllable, useA11yScope } from 'ui/hooks'
```

## State

| Hook | Summary |
|---|---|
| `useControllable` | Manages controlled / uncontrolled value state with a unified setter. |
| `useDeferredToggle` | Listbox/Combobox toggle logic; freezes the rendered selection through the panel's close animation. |
| `useSelectableValueChange` | Wraps `onValueChange` to drop the "cleared to undefined" event in multi-select mode. |
| `useOffcanvas` | Offcanvas sidebar open state with auto-close when the viewport crosses `--breakpoint-lg`; reports every transition to `onOpenChange`. |

## Floating & overlays

| Hook | Summary |
|---|---|
| `useFloatingPanel` | Base floating-panel hook: `useFloating` + autoUpdate and a standard offset/flip/shift/size middleware chain. |
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
| `useKeyboardLifted` | Lifted-item state for keyboard reordering: Space toggles, blur drops, `refocus` survives reorder re-renders. |
| `useKeyboardSettled` | Defers a callback until the virtual keyboard settles; fires immediately on desktop. |
| `useHoverAcrossScroll` | Hides a chart/map tooltip while scrolling and recomputes hover at the pointer once the scroll settles. |

## Accessibility

| Hook | Summary |
|---|---|
| `useA11yScope` | Universal a11y scope: stable id plus slot-driven `aria-labelledby`/`describedby` from only mounted slots. |
| `useA11yControl` | Field a11y scaffolding: `useA11yScope` specialized for a labelled control (label/description/error slots). |
| `useA11yPanel` | Modal-panel labelling scope: `useA11yScope` for dialog roots, setting role + `aria-modal` and title/desc ids. |
| `useA11yDisclosure` | Non-modal trigger↔panel pairing: reciprocal `aria-controls`/`aria-labelledby` (+ optional `aria-expanded`). |
| `useA11yRoving` | Arrow/Home/End roving over container items: focus or virtual mode, single-Tab-stop ownership, row cross-axis, or an indexed `VirtualItemSource` for windowed lists. |
| `useA11yAutoFocus` | Moves focus to `node` whenever `when` flips true, and again when the node attaches while `when` holds. Takes the node from a callback ref, not a `RefObject`. |
| `useA11yHasTabbable` | Whether a node holds a tab-order descendant, re-measured as its subtree changes; gates a tabpanel's tab stop and an interactive Tooltip's focus trap. |
| `useA11yLiveRegion` | Props for a consumer-filled live region: status/alert landmark with matching `aria-live`/`aria-atomic`. |
| `useA11yAnnouncements` | Declaratively narrates a changing status string to the live-region announcer, skipping initial and consecutive dupes; a status that clears and comes back speaks again. |
| `useAriaIds` | Composes the space-separated id list for `aria-labelledby`/`describedby`; falsy tokens drop, undefined if empty. |
| `useComposedRef` | Merges several refs into one callback ref; honors React 19 ref cleanup and identity swaps. |
| `useIdScope` | Stable scoped id plus a `sub(suffix)` deriver for related ids; falls back to a `useId` base. |

## Measurement & layout

| Hook | Summary |
|---|---|
| `useResizeObserver` | Observes size changes on `ref.current` and calls `callback` per change, plus once on attach. The callback rides an effect event, so a fresh closure each render neither re-subscribes nor re-fires. |
| `usePlotFrame` | Resolves a chart/map frame's drawing box from a `FrameSizing` policy — fixed, aspect-derived, container-fill, or content-fit — measuring only the axes that policy consumes. |
| `useMediaQuery` | True when `query` matches the viewport; true during SSR. |
| `useMinBreakpoint` | True when the viewport has reached a named breakpoint (`'lg'`), the same one the `lg:` prefix responds to; true during SSR. Prefer over `useMinWidth` — the name keeps JS and CSS on one scale. |
| `useMinWidth` | True when the viewport is at least `px` wide; true during SSR. For a width the breakpoint scale has no name for. |
| `useIsTruncated` | True when text overflows the element, measured with a `Range` over its own contents (not `scrollWidth`, and injecting nothing). |
| `useInView` | True when `ref.current` is in (or near) the viewport, over one `IntersectionObserver`. It disconnects on first sight by default, and reads true where nothing can observe, so a gate never hides content. |
| `useScrollOverflow` | Callback ref stamping `data-overflow-above`/`-below` on a scroll container while content extends past an edge, for CSS scroll affordances. Gate it off with `enabled: false` where the container cannot overflow. |
| `useScrollWithin` | Returns a scroll-into-view fn scoped to the nearest scrollable ancestor, stopping at clipping boundaries. `block` (default `'nearest'`) and opt-in `inline` align each axis. |
| `useVirtualWindow` | Drives a vertical windowed list off a `@tanstack/react-virtual` virtualizer: visible items plus top/bottom spacer heights, over uniform rows or, with a `getItemKey`, over measured rows. It renders only when the rendered items, their positions, or the total size change, so a scroll step that keeps the rows renders nothing. A measured list keeps the rows in view still when a row above them measures, in each scroll direction. With the start anchor, the first row in view also holds still when rows above it are inserted or removed. It can also hold its end in view. While the window is empty, the bottom spacer holds the height of every row, so a scroller that only `maxHeight` bounds grows to its cap. `scrollToIndex` takes an `align` and a `behavior`. Content above the first row, such as a table head, gives its height as `scrollMargin`. Its sticky part gives its height as `scrollPaddingStart`. Sticky content over the bottom edge gives its height as `scrollPaddingEnd`. `scrollToIndex` then lands a row in full view between them. |

## Drag & drop

| Hook | Summary |
|---|---|
| `useSortableList` | Single-list reorder backed by @dnd-kit: owns the drag lifecycle and commits via `arrayMove`. |
| `useSortableItem` | Wraps dnd-kit `useSortable` with standard transform/transition/drag-opacity style composition. |
| `useSortableSensors` | Standard dnd-kit sensor config: low-threshold pointer sensor plus arrow-key keyboard sensor. |
| `useGrabbingCursor` | Forces the grabbing cursor document-wide while active; ref-counted, injected as one universal rule. |

## Formatting & input

| Hook | Summary |
|---|---|
| `useFormattedInput` | Caret-preserving reformat engine for formatted inputs; core under `useMaskInput` / `CurrencyInput`. |
| `usePendingCaret` | Caret-preserving plumbing: queues a caret restore against the formatted value while the input holds focus. |

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
| `SetValue` | Argument to `useControllable`'s setter: a next value, `null`/`undefined` to clear, or a functional updater. |
| `InView` / `InViewOptions` | Return shape / options of `useInView` (`ref`, `inView`; `margin`, `once`). |
| `MinBreakpoint` | The argument `useMinBreakpoint` takes: every breakpoint name but the unprefixed base, which has no width of its own. |
| `RovingOptions` | Options for `useA11yRoving`: the item selector, axis, Tab-stop ownership, and the virtual-item source. |
| `ControllableOptions` | Options for `useControllable`: the controlled `value`, the uncontrolled `defaultValue`, and the change report. |
| `DeferredToggleOptions` | Options for `useDeferredToggle`. |
| `DismissableOptions` | Options for `useDismissable`: the boundary, the dismiss report, and the enable gate. |
| `EscapeLayerOptions` | Options for `useEscapeLayer`: where the layer sits in the stack and what a press does. |
| `FloatingDisclosureOptions` / `FloatingDisclosureResult` | Options and return shape of `useFloatingDisclosure`. |
| `FloatingUIOptions` / `FloatingUIResult` | Options and return shape of `useFloatingUI`. |
| `FloatingPanelOptions` / `FloatingPanelResult` | Options and return shape of `useFloatingPanel`. |
| `FormattedInputOptions` | Options for `useFormattedInput`: the `format` pass, the meaningful-character test, and the ref to compose. |
| `IdScopeOptions` | Options for `useIdScope`: the id to adopt in place of a generated one. |
| `KeybindingsOptions` | Options for `useKeybindings`: the bindings and the enable gate. |
| `OffcanvasOptions` | Options for `useOffcanvas`. |
| `ScrollOverflowOptions` | Options for `useScrollOverflow`: the enable gate, for a container that cannot overflow in one of its states. |
| `ScrollWithinOptions` | Options for `useScrollWithin`. |
| `SortableItemOptions` / `SortableListOptions` / `SortableSensorsOptions` | Options for the three `@dnd-kit` wrappers. |
| `VirtualWindowOptions` / `MeasuredVirtualWindowOptions` | Options for `useVirtualWindow`: the item count, the size estimate, the overscan, and the offsets of the content above the list. The measured form adds the stable row key, the `anchorTo` edge, and `followOnAppend`. |

`usePlotFrame` exports the types its own signature names: the sizing policy it takes, the reserve it returns, and its measuring handle. The chart and map modules share them with their frame-sizing helpers. The resolver behind it (`resolveFrameSizing`) and that resolver's return shape stay module-private. Reach them at `hooks/use-plot-frame` from inside the package.

| Type | Summary |
|---|---|
| `FrameSizing` | The frame's height policy: `fixed` (pixel height), `aspect` (ratio of width), `fill` (container height), or `content` (width minus a pair of margins). |
| `FrameReserve` | How a width-derived frame reserves its height through CSS: an `aspect` ratio, or a `content` ratio with a fixed pixel offset. |
| `PlotFrameRef` | The hook's measuring handle: a callback ref that re-targets the observer when React swaps the plot node, still readable through `.current`. |

---

**See also:** [`COMPONENTS.md`](COMPONENTS.md) · [`PRIMITIVES.md`](PRIMITIVES.md) · [`CORE.md`](CORE.md) · [`../REFERENCE.md`](../REFERENCE.md). Keep this current per [`CONVENTIONS.md` §12](../../../CONVENTIONS.md).
