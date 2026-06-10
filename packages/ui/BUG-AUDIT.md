# UI Bug Audit — Open Findings

Full-package audit of `packages/ui` (2026-06-10): every non-test source file
reviewed for logic errors, React correctness, races, leaks, accessibility
defects, and SSR hazards. Each finding below was confirmed against
surrounding code; line numbers are as of the audit commit and may drift.

Already fixed on `claude/ui-bug-audit-vmbnj1` (not listed below): editable-grid
spreadsheet-paste blanking the row below the target, currency-input separator
extraction corrupting comma-decimal locales, flat Escape dismissal closing
every open overlay layer at once, and non-modal Sheet rendering a blocking
backdrop.

## High — broken behavior

- [ ] **`src/components/editable-grid/use-editable-grid-wrapper.ts:48`** (with `use-editable-grid-draft.ts:42`) — `beginEdit` doesn't verify the active cell is mounted. Under `virtualize`, scrolling the active cell out of the window and pressing a key sets `editing=true` with no editor mounted: all keys and paste go dead, and the recovery paths commit the stale draft into a cell the user never edited.
- [ ] **`src/components/map/use-map-instance.ts:135-145`** — `map.setStyle()` on a `style`/`preset` prop change removes every custom source/layer; `MapRoute`/`MapGeofence` only add theirs in the single `load` handler and never re-add. A dark-mode preset toggle permanently erases routes and geofences. The style is also identity-compared, so an inline `style` object re-triggers the wipe every parent render. Fix shape: re-add sources/layers on `styledata`/`style.load`, and deep-or-key compare.
- [ ] **`src/components/file-upload/use-file-upload-handlers.ts:83-94`** — `handleDrop` feeds `dataTransfer.files` straight through: drag-and-drop bypasses both `accept` and `multiple`, which only constrain the native picker.
- [ ] **`src/components/command-palette/command-palette-item.tsx:36-40`** — disabled items are fully operable by pointer: consumer `onClick` fires *before* the `disabled` guard, and disabled link items still navigate (palette stays open). Keyboard correctly skips them, making pointer the inconsistent path.
- [ ] **`src/components/menu/menu-content.tsx:31-49`** + **`menu-item.tsx:102`** — static menus (`defaultOpen`, no `placement`) are unreachable by keyboard: every item hardcodes `tabIndex={-1}`, roving runs without `manageTabIndex`, and there is no autofocus entry point. Tab skips the whole `role="menu"` widget.
- [ ] **`src/layouts/sidebar/sidebar.tsx:78-108`** — `floating` mode's only opening affordances are `aria-hidden` pointer-hover zones, and the mobile open button is `lg:hidden`. On ≥lg viewports keyboard/screen-reader users cannot reach the navigation at all.
- [ ] **`src/components/chat-prompt/chat-prompt.tsx:92`** — the paperclip "Add attachment" button is hardcoded with no `onClick` and no prop to wire or suppress it: a focusable, announced control that does nothing in every composer.
- [ ] **`src/components/color/color-picker-content.tsx:60`** — `onMouseDown={(e) => e.preventDefault()}` on the popover body suppresses focus-on-click for the hex and R/G/B/A inputs (no caret, no drag-selection; Tab only). Harmless in `date-picker-content.tsx:105` (buttons only) where the pattern came from.
- [ ] **`src/providers/toast/use-toast-queue.ts:30-38`** + **`toast.tsx:77-111`** — single global timer, re-armed with the newest toast's duration; on expiry it flushes every non-persist toast. Per-toast `duration` is API surface but only governs the most recent push; older toasts either outlive or undercut their durations.

## Medium

- [ ] **Missing `pointercancel` handling (three hand-rolled drags)** — `src/components/resizable/use-resizable-panel.ts:207-227`, `src/components/scroll-area/use-scroll-area-scrollbar.ts:168-189`, `src/components/slider/range/use-range-pointer.ts:136-139`. A cancelled pointer (OS gesture, pen leaving range) leaves the drag flag set; subsequent buttonless pointer movement keeps resizing/scrolling/dragging. `use-color-drag.ts` and signature-pad show the correct in-repo pattern.
- [ ] **`src/components/kanban/use-kanban-drag.ts:148`** — `handleDragOver` commits cross-column moves via `onValueChange`, but `handleDragCancel` only clears the active id: Escape-cancelled drags strand the card in the last-hovered column instead of restoring the pre-drag layout.
- [ ] **`src/components/kanban/kanban-card.tsx:329`** — `overlayMap.current.set(cardId, children)` on every render, never deleted: unbounded growth on boards whose cards churn, each entry pinning a ReactNode tree.
- [ ] **`src/components/filters/filters.tsx:13`** (with `filters-field.tsx:78`) — `isActive(false)` is truthy: unchecking a Switch/Checkbox filter emits `{flag: false}` instead of `{}`, `activeCount` reports a phantom filter, and the live region announces it.
- [ ] **`src/components/calendar/use-calendar-month.ts:64-83`** — render-phase re-anchor compares `value` by reference; a controlled calendar receiving an inline `new Date()` snaps the view back on every parent re-render, making month navigation impossible. Compare by day (`isSameDay` exists in `calendar-utilities.ts`).
- [ ] **`src/components/color/use-color-state.ts:53-66`** — internal state commits before notifying and reconciles only on `value` identity change, so a controlled parent rejecting an update (same hex string) drifts; behavior differs between string and object wire formats.
- [ ] **`src/components/time-ago/use-time-ago-relative-time.ts:103-112`** — the clock effect's deps omit the date, so a `date` prop change renders against a stale `now` (up to a full adaptive interval, worst case ~24h).
- [ ] **`src/providers/toast/toast.tsx:81-86`** — caller-supplied `toast({ id })` appends unconditionally: duplicate ids produce duplicate React keys in `AnimatePresence`. Dedup/replace on collision.
- [ ] **`src/components/menu/menu-item.tsx:103-113`** — disabled menu items run consumer `onClick` before the `disabled` guard (same pattern as the command-palette finding above).
- [ ] **`src/components/menu/menu-trigger.tsx:24-33`** — clone branch spreads `getReferenceProps()` without the child's props, silently discarding a child `onKeyDown` (Escape handling) and dropping the accepted `className`. `TooltipTrigger`/`PopoverTrigger` compose correctly.
- [ ] **`src/components/slider/range/use-range-pointer.ts:61-63`** — `preventDefault()` on pointerdown suppresses focus and nothing focuses the thumb, so drag-then-arrow-key fine-tuning is dead and pointer users never see a focus ring.
- [ ] **`src/components/pdf-viewer/use-pdf-viewer-document.ts:139-147`** — a `null` `canvas.toBlob` result (Safari canvas-area cap) returns without `setLoading(false)`/`setError`: viewer stuck on "Loading PDF" forever.
- [ ] **`src/components/code/code-block.tsx:29-35,75-91`** — `loadShiki()` caches a rejected promise forever and the highlight chain has no `.catch`: one chunk-load failure disables highlighting for the session with unhandled rejections.
- [ ] **`src/components/map/map-marker.tsx:139-141`** (with `map-shipment.tsx:70-79`, `map-route.tsx:110-119`) — marker wrapper promoted to `role="button"` around a real `<button>` child: nested interactive controls, double tab stops; the shipment wrapper also lacks an accessible name.
- [ ] **`src/components/editable-grid/editable-grid.tsx:200`** — nothing scrolls the active cell into view (selection is `aria-activedescendant`-based, so the browser won't); under `virtualize` the id can dangle on an unmounted cell.
- [ ] **`src/layouts/dashboard.tsx:48`** (with `layouts/stacked.tsx:36`) — hardcoded `<main>` nests the `<main>` rendered by `StackedLayoutBody` in the documented composition: invalid HTML, duplicate landmark.
- [ ] **`src/recipes/kata/menu.ts:14-18`**, **`src/recipes/kata/option.ts:20-24`** — per-density/size `py-*` is defeated by the composed base's `sm:py-1.5` (responsive variant survives tailwind-merge and outranks bare utilities): all sizes render `py-1.5` at ≥sm; verified by executing the recipes.
- [ ] **`src/components/tag-input/tag-input-badge.tsx:43-48`** — disabled `TagInput` still allows badge focus and Backspace/Delete removal; the badge is also a focusable `role="listitem"` with no key-operable role/name.
- [ ] **`src/components/file-upload/use-file-upload-handlers.ts:59-94`** — drag handlers never check `disabled`: a disabled dropzone still accepts drops and lights up `data-drag-over`.
- [ ] **`src/components/date-picker/date-picker-utilities.ts:3-9`** — `toLocaleDateString()` with no locale: the trigger label ignores the `LocaleProvider` the calendar inside the same popover honors, and SSR/client locale divergence causes hydration text mismatch.
- [ ] **`src/layouts/sidebar/sidebar.tsx:128-134`** — inline callback ref re-runs `scrollWithin(current, {block:'center'})` on every commit while the drawer is open, fighting the user's scroll. Run once per open.
- [ ] **`src/components/progress/progress-gauge.tsx:40-52`** — no NaN guard (ProgressBar has one for the same case): `value={NaN}` (e.g. `0/0`) yields `aria-valuenow={NaN}` and an invalid SVG `strokeDashoffset`.

## Low

- [ ] **`src/components/editable-grid/use-editable-grid-numeric-editor.ts:149`** — type-to-edit with `-`/`.` as first key shows the old value but commits `parse("-")` on Enter/blur.
- [ ] **`src/components/editable-grid/editable-grid-cell-editor.tsx:258`** — `selectAllOnFocus={draft === formatted}` infers open mode by string equality: typing the cell's own value as the first key select-alls and the next keystroke wipes it. Thread the mode from `beginEdit`.
- [ ] **`src/components/data-table/data-table.tsx:223`** — virtualized plain DataTable forces `role="grid"` on a non-interactive table (the justifying comment is wrong: `aria-rowcount/rowindex` are valid on `role="table"`).
- [ ] **`src/core/announcer.ts:48-60`** — live region created and mutated in the same task: the first announcement of a session is unreliable with screen readers. Pre-create at provider mount or delay the first message.
- [ ] **`src/utilities/format-number.ts:4-10`** — `formatInteger(1234.5)` returns `"1,234.5"`; needs `maximumFractionDigits: 0`. Latent (both consumers pre-guard) but exported API.
- [ ] **`src/core/recipe/engine/types.ts:22`** — `CompoundRule` admits boolean axis values that `matches()` (strict string compare after `String()`-ification) can never satisfy; compiles clean, silently never applies.
- [ ] **`src/hooks/use-floating-ui.ts:131-137`** — focus-return effect runs on every open→close with no reason discrimination. Verified not to steal focus from clicked focusable targets (the effect flushes before `mousedown`'s default focus action), but outside presses on non-focusable areas land focus on the trigger, and the computed `'outside-press'` reason is never consumed; `useA11yFocusReturn.skipNextRefocus` exists for this.
- [ ] **`src/providers/toast/toast-alert.tsx:108-111`** — `onBlur` resumes the dismiss timer without checking hover: tabbing through a hovered toast auto-dismisses it under the pointer (WCAG 2.2.1).
- [ ] **`src/components/tree/tree-item-content.tsx:78-89`** — ArrowRight on expanded node doesn't move to first child, ArrowLeft on leaf doesn't move to parent; Up/Down also wrap, against the APG tree pattern.
- [ ] **`src/components/menu/menu-content.tsx:60-72`** — typeahead + `focusOnEmpty` hijack printable keys and arrows from any text input rendered inside `MenuContent`, making it untypeable.
- [ ] **`src/components/menu/menu-item.tsx:69-85`** — link items have no keydown handler: Space scrolls the page instead of activating the menuitem.
- [ ] **`src/components/combobox/use-combobox-input.ts:79`** — after Escape closes the popup, ArrowDown can't reopen it (roving queries the unmounted panel and bails); APG expects Down to open a closed combobox.
- [ ] **`src/components/command-palette/use-command-palette-state.ts:40`** — `aria-activedescendant` can dangle when async children change under an unchanged query; the combobox sibling has an every-render existence guard (`combobox.tsx:243-253`), the palette doesn't.
- [ ] **`src/components/list/use-list-drag.ts:24`** — `getKey` fallback maps by item identity, collapsing duplicate items to one key (duplicate React keys on `['a','b','a']`). Use positional keys.
- [ ] **`src/components/slider/range/range-slider.tsx:136,154`** — thumbs publish partner-clamped `aria-valuemin/max`, but default swap mode moves values past those bounds (Home/End jump to global min/max); only truthful in `clamp` mode.
- [ ] **`src/components/slider/range/use-range-pointer.ts:36`** (with `range-slider.tsx:124,142,160`) — RangeSlider is RTL-blind (physical `left` math) while the single native-input Slider mirrors automatically: opposite directions in one RTL form. Also no grab-offset compensation on thumb press (`:91-93`), so off-center presses snap the value, and `onPointerMove` doesn't re-check `disabled` mid-drag.
- [ ] **`src/components/color/color-hex-input.tsx:23-31`** — commit-as-you-type accepts 3/4-digit shorthand: typing `ff0000` transits through yellow then fully-transparent, firing `onValueChange` and jumping the panel per keystroke.
- [ ] **`src/components/color/color-area.tsx:73-79`** — the 2D field's `aria-valuenow` reflects only saturation; brightness-only changes move just `aria-valuetext`, which some AT won't re-announce.
- [ ] **`src/components/date-picker/use-date-picker-state.ts:97-99`** — "Today" emits raw `new Date()` (time-of-day contamination); every other path emits local midnight.
- [ ] **`src/components/date-picker/use-date-picker-range-state.ts:52-60,207`** — completed range parks in `pendingRef` until AnimatePresence's `onExitComplete`; unmounting before the exit animation (picker removed on selection, sheet closes) silently drops the selection.
- [ ] **`src/components/json-tree/json-tree-virtualized.tsx:58-66`** — `seededSearchRef` never resets when the search clears: re-searching the same term skips match-expansion seeding.
- [ ] **`src/components/json-tree/json-tree-utilities.tsx:240`** (with `json-tree-node.tsx:32`) — paths built with bare `.` concatenation: `{"a":{"b":1}}` and `{"a.b":2}` collide (`$.a.b`), producing duplicate keys and cross-toggling in controlled/virtualized expansion.
- [ ] **`src/components/signature-pad/use-signature-pad-drawing.ts:43-104`** — no `pointerId`/`isPrimary` filtering: a palm or second finger interleaves move events into straight-line artifacts.
- [ ] **`src/components/map/use-map-instance.ts:69-71`** — the shift-gated wheel guard swallows ctrl/cmd+wheel, killing trackpad pinch-zoom; cooperative-gesture implementations let modifier-wheel through.
- [ ] **`src/components/map/map-marker.tsx:62,78-80`** — `init` snapshot applied in the map `load` callback can overwrite a `position` prop update that landed in the module-loaded/style-loading window.
- [ ] **`src/components/scroll-area/scroll-area.tsx:65`** — focusability gated on configured orientation, not actual overflow: every fitting ScrollArea is an unlabeled tab stop, contradicting its own doc comment. Gate on thumb visibility.
- [ ] **`src/components/mask-input/use-mask-input.ts:48-52`** — `defaultValue` is formatted on seed but a controlled `value` renders verbatim until the first keystroke: controlled/uncontrolled display asymmetry.
- [ ] **`src/components/credit-card-input/credit-card-input-utilities.ts:67-77`** — `formatExpiry` is digits-positional: pasting `9/25` yields `92/5` instead of normalizing to `09/25`.
- [ ] **`src/components/fieldset/message.tsx:74-87`** — the multi-error `<ul>` branch never spreads `{...props}` (the single-message `<p>` branch does): consumer attributes vanish when errors go from one to several.
- [ ] **`src/components/currency-input/currency-input-utilities.ts:72-76`** — `formatEditing` round-trips the integer part through `Number()`: beyond 15 significant digits the display rewrites typed digits to the nearest float.
- [ ] **`src/recipes/kiso/hannou/cursor.ts:12`** — `has-[data-disabled]` compiles to `:has(data-disabled)` (a type selector for a nonexistent element); intended `has-[[data-disabled]]`/`has-data-disabled`. Spread into dozens of kata.
- [ ] **`src/recipes/kata/checkbox.ts:22`** — `has-[disabled]:*` same selector bug; currently dead weight (the composed base ships the correct `has-[:disabled]` forms).
- [ ] **`src/components/shiny-text/shiny-text.tsx:72-75,112-117`** — toggling `disabled` mid-sweep freezes the shine across the text instead of parking it off-screen (cleanup `stop()` runs before the park); and `{...props}` spread after the pause handlers lets a consumer `onMouseEnter`/`onMouseLeave` silently disable `pauseOnHover`.
- [ ] **`src/components/code/code-block.tsx:54-56`** — `useState` initializer reads the module-level `htmlCache` during render: hydration mismatch when same-content CodeBlocks hydrate across separate Suspense boundaries.

## Cross-cutting patterns

1. **`disabled` enforced only on the primary path** — command-palette items, menu items, tag-input badges, file-upload drag handlers all stay live through secondary input paths. Consider a shared convention: guard at the top of every composed handler, and stamp `pointer-events-none` for `data-disabled` surfaces.
2. **Hand-rolled drags skip `pointercancel`** — the correct pattern already exists in `use-color-drag.ts` (pointer capture + `lostpointercapture` as the authoritative reset); extract or copy it.
3. **Consumer handlers clobbered or fired out of order** — spread-order and clone-element prop composition (MenuTrigger, ShinyText); compose, don't replace.
