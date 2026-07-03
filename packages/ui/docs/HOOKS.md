# Hooks

> **Quick-glance index of `ui/hooks`.** Shared behavioral hooks — state, floating/overlay wiring, interaction, accessibility, measurement, drag-and-drop, and formatted input. The `a11y/` family layers atop `useA11yScope`. All are client-only (`'use client'`). Full signatures and caveats live in each hook's TSDoc.

```ts
import { useControllable, useA11yScope } from 'ui/hooks'
```

## State

| Hook | Summary |
|---|---|
| `useControllable` | Manages controlled / uncontrolled value state with a unified setter. |
| `useDeferredToggle` | Listbox/Combobox toggle logic; freezes the rendered selection through the panel's close animation. |
| `useSelectableValueChange` | Wraps `onValueChange` to drop the "cleared to undefined" event in multi-select mode. |
| `useOffcanvas` | Offcanvas sidebar open state with auto-close when the viewport crosses `--breakpoint-lg`. |

## Floating & overlays

| Hook | Summary |
|---|---|
| `useFloatingPanel` | Base floating-panel hook: `useFloating` + autoUpdate and a standard offset/flip/shift/size middleware chain. |
| `useFloatingUI` | Floating panel with built-in dismiss + role prop-getters for listbox/combobox/menu/datepicker surfaces. |
| `useFloatingDisclosure` | Disclosure wrapper over `useFloatingPanel`: controllable open state, trigger ref, focus restore, dismiss + role. |
| `useDismissable` | Overlay dismiss behavior: Escape (via the dismiss-layer stack) plus pointer-down outside the boundary. |
| `useEscapeLayer` | Escape-key dismissal routed through the shared dismiss-layer stack; stacked surfaces close innermost-first. |
| `useScrollLock` | Locks body overflow while active; nested locks reference-counted, scrollbar gap compensated. |

## Interaction

| Hook | Summary |
|---|---|
| `useKeybindings` | Subscribes to tinykeys keybindings for the component's lifetime, reading handlers fresh per event. |
| `useHasHover` | True when the device has a hover-capable pointer; true during SSR. |
| `useKeyboardLifted` | Lifted-item state for keyboard reordering: Space toggles, blur drops, `refocus` survives reorder re-renders. |
| `useKeyboardSettled` | Defers a callback until the virtual keyboard settles; fires immediately on desktop. |

## Accessibility

| Hook | Summary |
|---|---|
| `useA11yScope` | Universal a11y scope: stable id plus slot-driven `aria-labelledby`/`describedby` from only mounted slots. |
| `useA11yControl` | Field a11y scaffolding: `useA11yScope` specialized for a labelled control (label/description/error slots). |
| `useA11yPanel` | Modal-panel labelling scope: `useA11yScope` for dialog roots, setting role + `aria-modal` and title/desc ids. |
| `useA11yDisclosure` | Non-modal trigger↔panel pairing: reciprocal `aria-controls`/`aria-labelledby` (+ optional `aria-expanded`). |
| `useA11yRoving` | Arrow/Home/End roving over container items: focus or virtual mode, single-Tab-stop ownership, row cross-axis. |
| `useA11yAutoFocus` | Moves focus to `ref.current` whenever `when` flips true; re-focuses on false→true. |
| `useA11yLiveRegion` | Props for a consumer-filled live region: status/alert landmark with matching `aria-live`/`aria-atomic`. |
| `useA11yAnnouncements` | Declaratively narrates a changing status string to the live-region announcer, skipping initial and dupes. |
| `useAriaIds` | Composes the space-separated id list for `aria-labelledby`/`describedby`; falsy tokens drop, undefined if empty. |
| `useComposedRef` | Merges several refs into one callback ref; honors React 19 ref cleanup and identity swaps. |
| `useIdScope` | Stable scoped id plus a `sub(suffix)` deriver for related ids; falls back to a `useId` base. |

## Measurement & layout

| Hook | Summary |
|---|---|
| `useResizeObserver` | Observes size changes on `ref.current`, invoking `callback` per change plus once on attach. |
| `useMediaQuery` | True when `query` matches the viewport; true during SSR. |
| `useMinWidth` | True when the viewport is at least `px` wide; true during SSR. |
| `useIsTruncated` | True when text overflows the element, measured via an off-screen mirror span (not `scrollWidth`). |
| `useScrollWithin` | Returns a scroll-into-view fn scoped to the nearest scrollable ancestor, stopping at clipping boundaries. |
| `useVirtualWindow` | Drives a vertical windowed list off `@tanstack/react-virtual`: visible items plus top/bottom spacer heights. |

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

The a11y hooks export their option and return shapes for consumers that thread them:

| Type | Summary |
|---|---|
| `A11yScope` / `A11yScopeOptions` | Return shape / options of `useA11yScope` (id, `sub`, per-slot ids/registrars, composed `ariaProps`). |
| `A11yRelation` | Which ARIA relation a slot's id feeds: `'labelledby' \| 'describedby'`. |
| `A11yControl` | Return shape of `useA11yControl`: composed `describedBy`/`labelledBy`, slot ids, registrars. |
| `A11yPanel` / `A11yPanelProviderValue` / `A11yPanelRole` | `useA11yPanel` return, its provider value, and the dialog-root role (`'dialog' \| 'alertdialog'`). |
| `A11yDisclosure` / `A11yDisclosureOptions` | Return shape / options of `useA11yDisclosure` (trigger/panel ids and prop bags). |
| `A11yLiveRegionProps` / `A11yLiveRegionOptions` / `A11yLiveLevel` | Live-region props, options, and urgency (`'polite' \| 'assertive'`). |
| `A11yAnnouncementsOptions` | Options for `useA11yAnnouncements` (`assertive`, `enabled`). |

---

**See also:** [`COMPONENTS.md`](COMPONENTS.md) · [`PRIMITIVES.md`](PRIMITIVES.md) · [`CORE.md`](CORE.md) · [`../REFERENCE.md`](../REFERENCE.md). Keep this current per [`CONVENTIONS.md` §12](../../../CONVENTIONS.md).
