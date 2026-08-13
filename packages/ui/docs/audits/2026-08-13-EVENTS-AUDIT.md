# Events Audit — transitions the surface owns and never announces

**Date:** 2026-08-13 · **Scope:** every public callback prop on `ui` components, modules, layouts, primitives, and providers (89 component directories, 5 modules, 4 layouts, 23 primitives, 6 providers), examined for one defect only: a state transition or a user gesture that the surface owns internally and never emits. **Method:** twelve parallel source-read sweeps, one per surface bucket, each tracing every candidate to the line that holds the state; then an adversarial refuter for each bucket, then three cross-surface lenses (reachability, house idiom, completeness) over the merged set. A finding survives only when no refuter killed it. 54 candidates were raised and 19 were killed. **Living record — resolve rows in place, against the pull request that closed them.**

## Executive summary

The library announces state well where the state is a value. `onValueChange` appears 116 times, `onOpenChange` 42, and the controlled triads behind them are consistent. What the sweep found is a different gap: a surface computes something, acts on it, and keeps it. The consumer sees the result in the DOM and cannot see it in React.

The gap is not spread evenly, and the shape of its distribution is the most useful fact in this audit. **The modules are the reference implementation and the components are behind them.** `grid` exposes 54 distinct callbacks, `chart` 19, `map` 18. The grid brackets both of its drag gestures (`onResizeStart` / `onResizeEnd`, `onReorderStart` / `onReorderEnd`), reports the rejected half of a partition, and echoes every switchboard it owns. The component tier runs the same gestures and reports only the commit. Nine of the thirty-five rows below close a gap the grid already closed, which makes them extensions rather than inventions ([`CLAUDE.md`](../../../../CLAUDE.md) §1.1).

Silence is usually correct, and the sweep says so explicitly. Thirty-one of 89 component directories expose no callback at all, and almost all of them are right to: the static leaves (`badge`, `text`, `divider`, `swatch`) have no state, and the compound shells (`table`, `pagination`, `timeline`, `toolbar`, `breadcrumb`) hand the consumer the very parts that fire the events, so §3.6 composition already covers them. Nineteen candidates died on that reasoning or its neighbours — six on a transition that was not in the source, four because the consumer already owns the state, four because composition reaches it, three because the callback already exists, and two because the concept already has a settled house name.

Two of those refutations are worth naming, because they read as gaps and are not. `ScrollArea` composes the consumer's `onScroll` onto the viewport rather than the wrapper ([`scroll-area.tsx:74-79`](../../src/components/scroll-area/scroll-area.tsx)), so the native event already lands. `List` and `Kanban` look like the resize gap — both run an internal `handleDragStart` / `handleDragEnd` and expose only `onReorder` — but both publish the drag phase on a barrel-exported seam: `useListItemContext` carries `dragging` ([`list/index.ts`](../../src/components/list/index.ts)) and `useKanbanDragState` carries the active card ([`kanban/index.ts:7`](../../src/components/kanban/index.ts)). Neither is a finding.

Severity reads as consumer cost, not effort. **High** means the transition is unobservable and a real consumer is blocked today. **Medium** means it is unobservable but the workaround is tolerable. **Low** means it is unobservable and rarely wanted. Every row below is unobservable through props; where a DOM workaround exists, the row names it.

## Cross-cutting themes — one decision each

**T1 — The disclosure rule stops one step short.** `onOpenChange?: (open: boolean) => void` is the house's most uniform contract: Popover, Menu, Dialog, Sheet, Drawer, Listbox, Combobox, DatePicker, Calendar, Alert, Collapse, Tree, and Toast all ship it on the identical payload. Six surfaces own a full disclosure and emit nothing — Tooltip, ColorPicker, MenuSub, SidebarLayout, DashboardLayout, and the chart context menu's fullscreen Dialog. Decision: the rule is universal; a surface that owns an open state emits `onOpenChange`. Tooltip is the cheapest of the six, because `useFloatingDisclosure` already takes `open` / `defaultOpen` / `onOpenChange` ([`use-floating-disclosure.ts:26-28`](../../src/hooks/use-floating-disclosure.ts)) and `useTooltipState` passes only `open`, for `forceOpen`.

**T2 — Gesture brackets are module-only.** A pointer drag has three moments: it starts, it moves, it ends. The grid reports all three on both of its gestures ([`types.ts:362,369`](../../src/modules/grid/types.ts)). The component tier reports the middle one and drops the brackets: `ResizableGroup` fires `onSizesChange` on every pointermove while holding the phase in state it never emits ([`use-resizable-panel.ts:199`](../../src/components/resizable/use-resizable-panel.ts)), and `RangeSlider` runs a complete thumb-grab lifecycle behind a closed prop bag. A consumer cannot persist on drop, and cannot suspend expensive work during the drag. Decision: a gesture that the grid brackets, the component tier brackets too, with the grid's names.

**T3 — The rejected half of a partition is silent.** `FileUpload` is the house precedent for a batch outcome: `onAccept` and `onReject` are a symmetric pair ([`file-upload.tsx:37-39`](../../src/components/file-upload/file-upload.tsx)). Three surfaces partition and report only the accepted half. `TagInput` splits every commit four ways — accepted, rejected, duplicates, over-limit ([`tag-input-utilities.ts:88-113`](../../src/components/tag-input/tag-input-utilities.ts)) — and announces the outcome to the live region only. Grid editing drops every cell its column `validate` refuses, inside a `continue` ([`use-grid-editing.ts:106`](../../src/modules/grid/use-grid-editing.ts)). `Form` runs every validator on submit and returns early when any fails ([`use-form-reducer.ts:250-256`](../../src/components/form/use-form-reducer.ts)), so a refused submit is indistinguishable from no submit at all. Decision: a surface that partitions its input emits both halves, under FileUpload's names.

One caution for the implementer of the TagInput row. `TokenBatch` already carries the accepted set that `onValueChange` delivers, so emitting the whole batch under a verb named `onReject` would break the T4 grammar the 2026-07-22 audit settled. Narrow the payload to the refused partition, or ship FileUpload's pair whole. `TokenBatch` also carries an `@internal` tag ([`tag-input-utilities.ts:63`](../../src/components/tag-input/tag-input-utilities.ts)) while the barrel re-exports it, so the tag must drop before it can be a public payload — `internal-barrel-boundary.test.ts` pins that pair.

**T4 — Async failure is swallowed at four edges.** `CopyButton` catches a `writeText` rejection and drops it ([`use-copy-button-state.ts:58-61`](../../src/components/copy-button/use-copy-button-state.ts)), so a denied permission or an insecure context is indistinguishable from a copy that has not happened yet. `AddressInput` catches every non-abort geocoding rejection, empties the suggestion list, and shows the same empty state a genuine no-match produces ([`use-address-input-suggestions.ts:87-97`](../../src/components/address-input/use-address-input-suggestions.ts)). `PdfViewer` owns a fetch-and-rasterize lifecycle and reports neither end of it. The chart context menu's export swallows every failure in a bare `catch` whose comment states the intent ([`chart-context-menu.tsx:165-177`](../../src/modules/chart/engine/chart-context-menu.tsx)). The house already has the name: `useChatSend` takes `onError?: (error: unknown) => void` ([`use-chat-send.ts:120`](../../src/modules/chat/use-chat-send.ts)). Decision: a component that owns an async operation reports its failure.

**T5 — A state change is not an arrival.** `Drawer` distinguishes them — `onOpenChange` fires on the state flip and `onOpenComplete` fires when the panel is at rest ([`drawer.tsx:40`](../../src/components/drawer/drawer.tsx)). Dialog and Sheet are minted from the same `createPanel` family and ship only the first, so a consumer who must focus, measure, or start work after the motion settles has to guess a duration from a recipe-private preset. Collapse and Accordion observe the same landing internally, in the held branch of their panel motion, and keep it. `ReadyReveal` has the same shape and the library's own browser tests poll for its landing. Decision: a surface that animates its arrival emits `onOpenComplete`.

The close half of this pair is already settled and is not a finding: `onExitComplete` is the house name for it on two public primitives, and a proposed `Overlay.onCloseComplete` was refuted on exactly that ground.

**T6 — Internally-driven navigation is invisible.** Where the component's own chrome advances a position, the consumer sees only the first value it passed. `Calendar` owns the rendered month entirely inside `use-calendar-month.ts` and emits only the selected date, so a consumer who fetches per-month data has to reverse-derive the month from `getDayProps` calls. The grid's keyboard cell cursor moves on every arrow key and surfaces only on click. `MapPlat` holds a zoom and pan transform that the package's own tests read by regexing the `transform` attribute. `PdfViewer.onPageChange` ([`pdf-viewer.tsx:30`](../../src/components/pdf-viewer/pdf-viewer.tsx)) is the precedent for all of them. Decision: a component that drives a position emits it.

**T7 — Legend switchboards keep their set.** Clicking a chart or map legend entry toggles an index in a set the surface owns outright, and hiding a series changes what the reader sees. The grid's column manager already echoes the identical shape — `onHiddenChange?: (hidden: Set<string | number>) => void` ([`grid-data-types.ts:555`](../../src/modules/grid/grid-data-types.ts)). The chart and map switchboards do not, so a linked-view dashboard cannot mirror one chart's legend onto another. Decision: `onHiddenChange`, on the grid's name and payload shape.

## Findings — components

| Surface | Proposed | Site | Transition it owns | Precedent | Status |
|---|---|---|---|---|---|
| Tooltip | `onOpenChange` | `tooltip.tsx:9` | Full disclosure from hover delay, focus, click, `forceOpen`, and the overlay signal; context holds `open`, the barrel exports only components (T1) | Popover `popover.tsx:18` | ◯ OPEN |
| ColorPicker | `onOpenChange` | `color-picker.tsx:13` | `useState(false)` at `use-color-picker-state.ts:54`; root is a `display: contents` wrapper, panel portals out (T1) | every floating trigger in `components/` | ◯ OPEN |
| MenuSub | `onOpenChange` | `menu-sub.tsx:64` | Submenu opened by hover-intent, click, and Enter/Space; closed by blur; children mount only while open (T1) | TreeItem `onOpenChange` | ◯ OPEN |
| ResizableGroup / Handle | `onResizeStart` / `onResizeEnd` | `resizable-group.tsx:13` | `setDragging(handleIndex)` / `setDragging(null)` at `use-resizable-panel.ts:199`; `onSizesChange` fires on every pointermove (T2) | grid `types.ts:362,369` | ◯ OPEN |
| RangeSlider | `onDragStart` / `onDragEnd` | `range/range-slider.tsx:18` | Thumb grab, stacked-pair deferral, and release at `use-range-pointer.ts:117-156`; closed prop bag, no rest spread (T2) | `use-sortable-list.ts:27,33` | ◯ OPEN |
| Form | `onInvalidSubmit` | `form.tsx:40` | Runs every validator on submit and returns early when any fails, `use-form-reducer.ts:250-256`; a refused submit and no submit look identical (T3) | FileUpload `onReject` | ◯ OPEN |
| AddressInput | `onError` | `address-input.tsx:16` | Catches every non-abort geocoding rejection at `use-address-input-suggestions.ts:87-97`, then empties the list — a provider outage renders as "no matches" (T4) | `use-chat-send.ts:120` | ◯ OPEN |
| DateInput | `onValidityChange` | `date-input.tsx:40` | Holds `typedInvalid`, its own verdict on the typed text, set on every keystroke at `:244`; `onValueChange` emits `undefined` for cleared, partial, and invalid alike | CreditCardInputExpiry ships this exact callback | ◯ OPEN |
| Collapse | `onOpenComplete` | `collapse.tsx:12` | Height and opacity landing, observed internally in the held branch of the panel motion and kept (T5) | Drawer `drawer.tsx:40` | ◯ OPEN |
| Accordion | `onOpenComplete` | `accordion.tsx:20` | Same landing, per section, observed only at `accordion-panel.tsx:79` (T5) | Drawer `drawer.tsx:40` | ◯ OPEN |
| TagInput | `onReject` | `tag-input.tsx:38` | Partitions every commit into accepted / rejected / duplicates / over-limit; announces to the live region only (T3) | FileUpload `file-upload.tsx:37-39` | ◯ OPEN |
| CopyButton | `onCopyError` | `copy-button.tsx:13` | `writeText` rejection caught and dropped at `use-copy-button-state.ts:58-61`; the hook is not exported (T4) | `use-chat-send.ts:120` | ◯ OPEN |
| PdfViewer | `onLoad` / `onError` | `pdf-viewer.tsx:13` | Fetch → rasterize → settle or fail, owned in `use-pdf-viewer-document.ts:224,226`; a consumer must re-fetch `src` to learn of a 404 (T4, T6) | `use-chat-send.ts:120` | ◯ OPEN |
| Dialog | `onOpenComplete` | `dialog.tsx:14` | Owns the motion element and the `k.motion.desktop` / `k.motion.mobile` preset chosen by `useMinWidth`; preset is recipe-private (T5) | Drawer `drawer.tsx:40` | ◯ OPEN |
| Sheet | `onOpenComplete` | `sheet.tsx:14` | Same arrival on the per-`side` slide, `sheet.tsx:128-129`; same `createPanel` family (T5) | Drawer `drawer.tsx:40` | ◯ OPEN |
| Calendar (+ CalendarRange / DatePicker forward) | `onMonthChange` | `calendar.tsx:69` | Owns `viewDate` and its five writers in `use-calendar-month.ts`; consumers reverse-derive the month from `getDayProps` (T6) | PdfViewer `onPageChange` | ◯ OPEN |
| TreeItem | `onAction` | `tree-item.tsx:9` | Row activation by click and Enter/Space; on a leaf it does nothing observable, so consumers plant a control in `prefix` to catch the synthesized click | ContextMenu `types.ts:22` | ◯ OPEN |
| PasswordInput | `onVisibleChange` | `password-input.tsx:13` | Plaintext reveal owned at `:62`, flipped by the internal suffix toggle at `:83`; `type` and `suffix` are both `Omit`ted | CopyButton `onCopiedChange` | ◯ OPEN |
| FileUpload | `onDragOverChange` | `file-upload.tsx:24` | Depth counter at `use-file-upload-handlers.ts:46` derives `dragOver`; only readout is a `MutationObserver` on `data-drag-over` (T2) | CopyButton `onCopiedChange` | ◯ OPEN |
| Listbox | `onBlur` | `listbox.tsx:80` | `handleTriggerBlur` computes focus leaving the widget — ignoring a blur into the portalled panel — and keeps it; closed prop bag, no rest, no `ref` | Slider chains `onBlur`, `slider.tsx:60` | ◯ OPEN |
| SignaturePad | `onDrawStart` | `signature-pad.tsx:17` | `drawingRef.current = true` and the initial dot at `use-signature-pad-drawing.ts:75-88`; only `onValueChange` on stroke end escapes (T2) | HoldButton's full triad | ◯ OPEN |
| CommandPalette | `onActiveChange` | `command-palette.tsx:23` | Virtual roving moves the option highlight on every arrow key, `use-command-palette-state.ts:63-69`; readable only via `aria-activedescendant` | none in `ui` | ◯ OPEN |

One caution for the implementer of the DateInput row. Reuse the exported `CardValidity` ([`credit-card-input-utilities.ts:88-91`](../../src/components/credit-card-input/credit-card-input-utilities.ts)) rather than re-spelling its shape inline (§1.1, and the 2026-07-22 audit's T9). Note also that DateInput holds one boolean today, so only the invalid verdict is an unannounced state; an `isPotentiallyValid` arm is a new derivation, not an existing one. `CreditCardInputExpiry`'s own comment names DateInput as the model it mirrors, which makes this row the return leg.

## Findings — layouts and primitives

| Surface | Proposed | Site | Transition it owns | Precedent | Status |
|---|---|---|---|---|---|
| SidebarLayout | `onOpenChange` | `layouts/sidebar/sidebar.tsx:39` | Mobile drawer state via `useOffcanvas()` at `:65`, opened at `:158`, closed on four paths; closed prop bag, no spread reaches any element (T1) | Drawer `drawer.tsx:23` | ◯ OPEN |
| DashboardLayout | `onOpenChange` | `layouts/dashboard.tsx:13` | Mobile filters drawer at `:29`, opened at `:43`, closed through the Drawer's dismiss at `:50`; no context, no ref, no spread (T1) | Drawer `drawer.tsx:23` | ◯ OPEN |
| ReadyReveal | `onReadyComplete` | `primitives/ready-reveal/ready-reveal.tsx:10` | Latches `settled` from Motion's `onAnimationComplete` at `:131-133`, then hides the placeholder; the library's own browser tests poll for it (T5) | Drawer `onOpenComplete` | ◯ OPEN |

## Findings — modules

| Surface | Proposed | Site | Transition it owns | Precedent | Status |
|---|---|---|---|---|---|
| Chart legend switchboard (Bar / Line / Area / Combo / Scatter / Bubble / Pie / Donut) | `onHiddenChange` | `chart/engine/types.ts:224` | `toggleItem` in `use-chart-series-toggle.ts:25-27` owns the hidden set; only readout is a `MutationObserver` over `aria-pressed` (T7) | grid `grid-data-types.ts:555` | ◯ OPEN |
| MapPlat | `onViewChange` | `map/map-plat.tsx:195` | `zoom` arms wheel, drag, pinch, and keyboard gestures whose scale and translation stay in `useMapZoom`; the package's own tests regex the `transform` attribute (T6) | grid's echo-plus-gesture triads | ◯ OPEN |
| MapPlat legend switchboard | `onHiddenChange` | `map/map-plat.tsx:341` | `useMapToggle.toggle` at `use-map-toggle.ts:73-91`; the legend is built from data, so no sub-component exists to compose (T7) | grid `grid-data-types.ts:555` | ◯ OPEN |
| MapPlat legend emphasis | `onEmphasisChange` | `map/map-plat.tsx:341` | Legend hover or focus writes `setFocus` at `use-map-toggle.ts:57`; passing `emphasis` silently deadens the plat's own legend hover | same file's `selectedRegion` + `onRegionClick` | ◯ OPEN |
| ChartContextMenu export (every chart, plus Choropleth) | `onExport` | `chart/engine/chart-context-menu.tsx:50` | `exportImage` swallows every rasterize failure in a bare `catch` at `:165-177`; the four helpers behind it are unexported (T4) | grid `onCommit` | ◯ OPEN |
| ChartContextMenu fullscreen | `onFullscreenChange` | `chart/engine/chart-context-menu.tsx:50` | `useState(false)` at `:132`, raised by the Fullscreen item, lowered by Escape or Close; `ChartFullscreenContext` is `@internal` (T1) | the Dialog it opens | ◯ OPEN |
| Grid (editable) | `onReject` | `grid/grid-editing-types.ts:157` | `flushRow` drops every cell its column `validate` refuses at `use-grid-editing.ts:106`, and skips the sink entirely when nothing survives (T3) | FileUpload `onAccept` / `onReject` | ◯ OPEN |
| Grid (navigable) | `onActiveCellChange` | `grid/grid-data-types.ts:990` | Keyboard cell cursor at `use-grid-navigation.ts:195`, moved by `moveTo` at `:268`; `onCellClick` covers the pointer only (T6) | the grid's own resize brackets | ◯ OPEN |
| Grid (column groups) | `onCollapsedChange` | `grid/grid-group-types.ts:43` | Collapsed band set seeded once from `defaultCollapsed` at `use-grid-group.ts:80-96`, never emitted and unwritable after mount | `GridExpandable`'s triad | ◯ OPEN |

## Refuted — recorded so the next sweep does not relitigate

| Surface | Candidate | Why it is not a finding |
|---|---|---|
| ScrollArea | `onScroll` | The root composes the consumer's handler onto the viewport, `scroll-area.tsx:74-79`. |
| ScrollArea | `onOverflowChange` | The held state is thumb geometry, not an overflow verdict; the two are not separable at that seam. |
| Overlay (and the Dialog / Sheet / Drawer roots) | `onCloseComplete` | The concept already has a house name on two public primitives: `onExitComplete`. |
| CodeBlock | `onError` | `loadShiki` is a public memoized module singleton; the consumer can await it and catch. |
| Grid (`groupBy`, client mode) | `onExpandedChange` client arm | Widens an existing callback rather than adding a missing one. |
| List | `onReorderStart` / `onReorderEnd` | `useListItemContext` publishes `dragging` from the barrel. |
| Kanban | `onReorderStart` / `onReorderEnd` | `useKanbanDragState` is barrel-exported at `kanban/index.ts:7`. |
| Table, Pagination, Timeline, Toolbar, Breadcrumb | item-level events | §3.6 composition: the consumer owns the parts that fire them. |
| RadioGroup | `onValueChange` | No group-level `value` either; a triad gap owned by the 2026-07-22 API-consistency audit. |

---

**See also:** [`../../REFERENCE.md`](../../REFERENCE.md) · [`2026-07-22-API-CONSISTENCY-AUDIT.md`](2026-07-22-API-CONSISTENCY-AUDIT.md) · [`CONVENTIONS.md` §12.3](../../../../CONVENTIONS.md).
