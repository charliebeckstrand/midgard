# Effect Audit — 2026-10-09

**Lens:** each `useEffect`, `useLayoutEffect`, and `useInsertionEffect` in `packages/ui/src`, outside the tests and the benches. The sweep asks two questions of each effect. Can the effect go, because render, an event handler, a key, a ref callback, `useSyncExternalStore`, or an existing hook does its job? If the effect stays, can it cost less: narrower dependencies, a passive effect in place of a layout effect, or one shared listener in place of one for each instance?

**Method:** seven read-only sweeps, one for each scope: the Grid module; the Map, Chart, Chat, Query, and Dashboard modules; the hooks; components A to J; PdfViewer and Tooltip; components K to Z; and the primitives, the providers, and the docs app. Each sweep read each effect, its dependency list, its component, and its callers. The sweeps applied CONVENTIONS §10.7 and §10.8 and the rule that the first paint is the exact final layout. No claim here is *probed*: no scratch test ran. A row that says "needs a test" names the case that a test must hold before the change lands.

**Count:** 314 effects in 206 files. The other matches of the search are TSDoc examples and comments. Of the 314 effects, 51 have a cleaner form, in the 48 rows below. The other 263 effects are the right tool: a pre-paint measure or write, a subscription with correct dependencies, a store publish after a commit, focus after a commit, a registration with cleanup, or an unmount cleanup. Section 7 lists the kept groups that look like a finding but are not.

**Classes:** **A** is mechanical, with no change in behavior. **B** holds the documented behavior, but the timing changes or a test must hold an edge case. **C** needs a decision from the owner: a new shared abstraction, a change across `utilities`, or a change in behavior (CLAUDE.md §1.1, §3.1).

**Start:** *Yes* marks a row of high confidence that is local to one file or one hook. Section 9 groups the *Yes* rows into pull requests, one rule each.

**Status:** *Fixed in #NNNN* where a pull request closes the row. *Open* where no pull request closes the row yet. *Declined* where the owner chose to leave a row as it is (CONVENTIONS §12.4).

## 1. Remove the effect: latest ref to `useStableEvent`

Each row copies the newest props or callbacks into a ref from an effect, so that a callback keeps one identity. CONVENTIONS §10.8 forbids this form, because a child runs its layout effects first and can read the handler of the last commit. Each reader below is an event, a timer, or a listener, never render, so `useStableEvent` is safe. §10.8 asks for a run in the browser suite and under jsdom before each conversion lands.

| ID | Where | Current | Proposed change | Behavior | Class | Start | Status |
|---|---|---|---|---|---|---|---|
| L1 | `components/json-tree/json-tree.tsx:150` | A layout effect copies `expanded` and `onExpandedChange` into `latest` for `toggleExpanded` and `expandControlled`. | Make each a `useStableEvent` that reads the props. Delete `latest` and the effect. A node click and the passive seed effect are the only callers. | None | A | Yes | Fixed in #2228 |
| L2 | `components/combobox/use-combobox-state.ts:169` | A passive effect with no list copies `query`, `deferredQuery`, and `open` into three refs on each commit, for `close`. | Make `close` a `useStableEvent`. Blur, Escape, an outside press, and `keep` call it, never render. The stale window between the commit and the passive flush also goes. | None | A | Yes | Fixed in #2228 |
| L3 | `hooks/use-deferred-toggle.ts:75` | A passive effect with no list copies `value` into `valueRef` for `commit`. Two callers: listbox and combobox state. | `const commit = useStableEvent((v: T) => { freeze(value); toggle(v) })`. The identity then holds for the mount. | None | A | Yes | Fixed in #2228 |
| L4 | `hooks/use-keyboard-reorder.ts:73` | A passive effect with no list copies all of `options` into `latest`. Each list item gets `onItemKeyDown`. Two callers: List and the query builder. | Make `onItemKeyDown` one `useStableEvent` that reads `options`. `navigate` and `carry` become plain inner functions. | None | A | Yes | Fixed in #2228 |
| L5 | `components/kanban/use-kanban-keyboard.ts:300` | A passive effect with no list copies four move callbacks into `latest` for `onCardKeyDown`. | Make `onCardKeyDown` a `useStableEvent` that reads the four callbacks. Only the grip `onKeyDown` calls it. | None | A | Yes | Fixed in #2228 |
| L6 | `components/tooltip/tooltip-intent.ts:237` | A layout effect with no list copies `options` into `optionsRef`, which `listenForIntent` reads in its native listeners. | `const readOptions = useStableEvent(() => options)`. Give `listenForIntent` a function in place of the ref, and list `readOptions` in `setReference`. | None | A | Yes | Fixed in #2228 |
| L7 | `modules/grid/grid-column-resize-handle.tsx:57` | A passive effect copies `size` into `sizeRef` for the debounced width announcement. | `const announceWidth = useStableEvent(() => announce(describeResize(label, size)))`, and the timer calls it. | None | A | Yes | Fixed in #2228 |
| L8 | `modules/grid/use-grid-client-view.ts:426` | `useFacetSource` writes `latest` in a layout effect and returns `useCallback((id) => latest.current(id), [])`. | `return useStableEvent((id: string) => source(id))`. `GridColumnFilterButton` calls it from an event or from an effect event, never render. | None | A | Yes | Fixed in #2228 |
| L9 | `components/tooltip/use-tooltip-state.ts:264` | A layout effect with no list writes a replay closure into `replayRef`. The trigger ref callback `setReference` calls it. | A `useStableEvent` for the replay, which `setReference` calls and lists. Keep `stopReplayRef`, which is state, not a latest ref. Needs a test: the ref callback reads the handler in the same commit. | None | B | No | Open |
| L10 | `modules/map/use-map-overlay.ts:343` | One layout effect writes five fields into `live`. Render reads three of them. Only the event handlers `pick` and `menuMark` read `onClick` and `onContextMenu`. | Move the two handlers to `useStableEvent`. The effect keeps the three fields that render reads, and an inline consumer handler no longer runs it on each render. | None | B | No | Open |

## 2. Remove the effect: an existing hook does the job

| ID | Where | Current | Proposed change | Behavior | Class | Start | Status |
|---|---|---|---|---|---|---|---|
| H1 | `hooks/a11y/use-typeahead.ts:139` | `matchTypeaheadCore` keeps a hand-kept timer id in `stateRef.current.timer`, and an unmount effect clears it. Each of the 21 `useA11yRoving` callers pays for it. | Use `useTimeout()` and give its `Timeout` to the matcher (`{ query; reset: Timeout }`). The effect and the `typeof window` guards go. `use-typeahead.test.ts` builds the old state shape and changes with it. | None | A | Yes | Fixed in #2229 |
| H2 | `components/menu/use-menu-touch-hold.ts:46` | The hold timer id is in `hold.current.timer`, and an unmount effect clears it. | `useTimeout()` for the timer. Keep `{ x, y }` in the ref. Use `pending()` where the code checks `hold.current`. | None | A | Yes | Fixed in #2229 |
| H3 | `components/scroll-area/use-scroll-area-scrollbar.ts:196` | `scrollFadeTimeoutRef` holds a hand-kept timer id. The unmount effect clears it and cancels the thumb frame. | `useTimeout()` for the fade timer. The unmount effect then cancels only `thumbFrameRef`. | None | A | Yes | Fixed in #2229 |
| H4 | `components/toast/use-toast-timer.ts:41` | `timerRef` holds one timer that sets itself again, and an unmount effect clears it. | `useTimeout()`. `run` calls `set`, and `pause` calls `clear`. `timeout` is stable, so the callback lists keep their identity. | None | A | Yes | Fixed in #2229 |
| H5 | `components/kanban/kanban-column.tsx:55` | A hand-written dev effect warns when `known === undefined`. | `useDevWarning(known === undefined, message)`. The message holds `columnId`, so a new unknown id warns again, as now. | None | A | Yes | Fixed in #2234 |
| H6 | `components/kanban/kanban-card.tsx:59` | A hand-written dev effect runs `itemIds.includes(cardId)` and warns again on each reorder of the column. | `useDevWarning(process.env.NODE_ENV !== 'production' && !itemIds.includes(cardId), message)`. The hook warns on the rising edge only. | Dev console only: no repeat warning | A | Yes | Fixed in #2234 |
| H7 | `modules/dashboard/dashboard.tsx:503` | A layout effect and a `reported` ref report `projected` to `onProjectedChange` once for each change. | `useReportedChange(projected, onProjectedChange)`. The hook seeds from the mount value and reports in a passive effect. Needs a test: `projected` must be `false` at mount for the two to agree. | Timing only | B | No | Open |
| H8 | `components/copy-button/use-copy-button-state.ts:120` | A passive effect on `copied` and `timeout` starts the revert timer. | Start the timer in `copy` with `useTimeout().set(...)`. A change of `timeout` while `copied` holds no longer restarts the revert window. | Timing only | B | No | Open |
| H9 | `primitives/current/current-contents.tsx:91` | An inline `useRef(false)` and a mount effect latch `settledRef`. | `useMountedRef()`. That hook also writes `false` on cleanup, so a panel that mounts in a hidden `<Activity>` skips its entrance. Today that panel enters. | Visible, in a hidden Activity only | C | No | Open |

## 3. Remove the effect: a ref callback with cleanup

Each row holds a node in a ref or in state only so that a mount effect can act on it. A React 19 ref callback that returns its cleanup does the same work in the commit phase. A module-level callback keeps one identity, so it does not detach on each render.

| ID | Where | Current | Proposed change | Behavior | Class | Start | Status |
|---|---|---|---|---|---|---|---|
| R1 | `components/pdf-viewer/pdf-viewer-page-image.tsx:68` | A layout effect on `bitmap` sizes the canvas, draws the bitmap, and zeroes the backing store on cleanup. | `useCallback((canvas) => { size; draw; return zero }, [bitmap])` as the canvas ref. A new `bitmap` runs the cleanup and then the new draw, the same order as the effect. The draw still lands before paint. | None | A | Yes | Fixed in #2231 |
| R2 | `modules/grid/grid-editing-cell.tsx:36` | A mount layout effect finds the `gridcell` ancestor of a span, sets `aria-busy`, and removes it on cleanup. | A module-level `markCellBusy(node)` ref callback that sets the attribute and returns the cleanup. | None | A | Yes | Fixed in #2231 |
| R3 | `modules/grid/grid-cell-editor.tsx:331` | `messageRef` and a passive effect on `hasError` scroll the error message into view. The span mounts exactly when `error` is truthy. | A module-level `revealMessage(node)` ref callback. Drop `messageRef`, `hasError`, and the effect. | Timing only: the scroll runs before paint | B | Yes | Open |
| R4 | `components/pdf-viewer/use-pdf-viewer-magnifier.ts:543` | `setReference` puts the frame node in `frameNode` state, and a passive effect adds the non-passive touch listeners. The state write renders the provider, the frame, and the lens again on mount. | Add the listeners in `setReference` and return the cleanup. The callback must list `enabled`, so a toggle of the loupe detaches and attaches the floating-ui reference again. Needs a test for that toggle. | Timing only | B | No | Open |
| R5 | `components/tabs/tab-list.tsx:58` | A mount effect starts a `MutationObserver` that keeps one tab tabbable. | A module-level `observeTabbableFloor(el)` ref callback, composed through `useComposedRef`. Needs a test under `<Activity mode="hidden">`, where React detaches and attaches refs. | Timing only | B | No | Open |
| R6 | `components/calendar/use-calendar-picker.tsx:140` | On open, a passive effect schedules a focus frame and a second frame that sets `gridMounted`, on the assumption that the portal grid mounts one frame later. | Set `gridMounted` and focus from a ref callback on the picker grid. Needs a test: a reopen during the exit animation can keep the same grid node, and the callback then does not run again. | Timing only | B | No | Open |

## 4. Remove the effect: render or the event handler

| ID | Where | Current | Proposed change | Behavior | Class | Start | Status |
|---|---|---|---|---|---|---|---|
| E1 | `components/confirm/use-confirm.tsx:111` | A passive effect on `asked && !dialog` loads the confirm module after a question is set. | Start the load in `ask`, the event that sets the question. `import()` caches, so a second call is free. | Timing only: the load starts one commit earlier | A | Yes | Fixed in #2234 |
| E2 | `components/tabs/use-tab-list-scroll.ts:89` | The mount effect also adds a native `focusin` listener on the scroller. | Return an `onFocus` handler from the hook, and put it on the scroller in `tab-list.tsx`. React `onFocus` bubbles as `focusin` does. The effect keeps only the mount scroll. | None | A | Yes | Fixed in #2234 |
| E3 | `components/form/use-form-reducer.ts:302` | A layout effect compares the controlled `values` with the last synced values and dispatches `sync-values`. The stale values commit once, and the store publishes them, before the second render. | Compare during render and dispatch there. Move the mount defaults from `initialDefaultsRef` to `useState`, because render must not read a ref. The stale commit and the second publish go. | Timing only | B | No | Open |
| E4 | `components/form/use-form-reducer.ts:220` | A layout effect copies `values` into `valuesRef` for `getValue` and `handleSubmit`. `getValue` is public, and a consumer can call it in render, so `useStableEvent` does not fit. | Read `store.getState().values`. Split `useFormStore` into create and publish, so that the store exists before the callbacks. | None | B | No | Open |
| E5 | `components/command-palette/use-command-palette-state.ts:57` | `useEmptyResults` calls `setEmpty(false)` when the list detaches, which renders the palette again. | Return `list !== null && empty`, and remove that branch. The first measure after an attach writes the state before paint. | None | B | No | Open |
| E6 | `modules/grid/grid-busy-status.tsx:17` | The effect sets `'Loading'` when `loading` turns true, one commit after the render that saw it. | Set `'Loading'` during render with a guard. Keep the effect for the debounced count only. | Timing only: the live region updates one commit earlier | B | No | Open |
| E7 | `modules/grid/grid-filter.tsx:61` | A `resets` counter increments during render on an owner reset, and an effect on it clears the pending debounce. | Make the debounced push check that its text is still current, through a `useStableEvent`. An owner reset sets `text`, so a stale timer does nothing. Delete `resets` and the effect. | None | B | No | Open |
| E8 | `modules/grid/grid-cell-editor.tsx:267` | While `held`, a passive effect adds a native `focusin` listener on the host span. | A React `onFocus` on the span. React focus events bubble through portals, and React runs the inner `onFocus` first, where the native listener ran first. Needs a test for both. | Timing only | B | No | Open |
| E9 | `modules/grid/use-grid-navigation.ts:915` | A layout effect writes `activeKeyRef` from `active` and `view.order`. Only `publish` reads it. | Compute the key inside `publish`. Needs a test: `readActive()` reads the store, which an event can write before the render, so it can differ from the `active` of the effect. | None, if equal | B | No | Open |
| E10 | `modules/dashboard/dashboard-tile-expand.tsx:92` | An effect copies `open` into `openRef` for the unmount cleanup. | Write `openRef` in `handleOpenChange`, the only writer of `open`. Needs a test for an open and an unmount in the same batch. | Timing only | B | No | Open |

## 5. Make the effect cheaper

| ID | Where | Current | Proposed change | Behavior | Class | Start | Status |
|---|---|---|---|---|---|---|---|
| C1 | `modules/map/use-map-zoom.ts:761, 859, 935` | The wheel, touch pinch, and gesture guard effects list `view.width` and `view.height`, but only test that each is above 0. Each resize frame removes and adds the native listeners. A resize during a pinch drops the listeners on the contact targets that the pinch follows. | Derive `framed = view.width > 0 && view.height > 0` once, and list it in the three effects. The SVG mounts exactly on that condition (`map-plat.tsx:1253`). CONVENTIONS §10.7 allows a derived condition. | None. A resize during a pinch keeps its targets. | A | Yes | Fixed in #2227 |
| C2 | `components/breadcrumb/breadcrumb-fit.tsx:82` | A layout effect with an empty list only attaches `document.fonts.ready.then(measure)`. It reads and writes no layout. | `useEffect`. The layout effect at line 78 already measures before the first paint. | Timing only | A | Yes | Fixed in #2234 |
| C3 | `hooks/a11y/use-a11y-has-tabbable.ts:27` | When `node` turns `null`, the effect calls `setHasTabbable(false)`, one more render. On a swap from node A to node B, the render shows the value of A until the effect of B runs. | Keep the reading with its node: `{ node, has }`, and return `reading?.node === node && reading.has`. | Timing only | A | Yes | Fixed in #2234 |
| C4 | `hooks/use-hover-across-scroll.ts:57` | The window `pointermove` capture listener stays for the whole mount, also while `enabled` is false. Three callers: chart pointer, sector marks, and map hover. | Step 1: merge the two effects into one on `[enabled]`, so a chart with no tooltip adds no listener. Step 2 is C8. | Timing only: after `enabled` turns true, a scroll before any pointer move resolves nothing | B | Yes | Open |
| C5 | `modules/grid/use-grid-cursor.tsx:397, 718` | Each range grid adds a document `copy` listener and a document `paste` listener for its whole life. Each handler returns unless its own table has focus. | Gate each on a seated cursor: `copies && nav.active !== null`, a boolean, so a cursor move does not subscribe again. Needs a test: Ctrl+C right after the focus that seats the cursor. | None | B | No | Open |
| C6 | `components/slider/range/range-slider.tsx:188` | Each `RangeSlider` adds a document `click` listener that runs `closest('label')` on each click on the page. | An `onClick` on the start thumb that focuses it. A label click activates its labelable button. Run `range-slider-label-click.test.tsx` in each browser engine. | None | B | No | Open |
| C7 | `primitives/virtual-options/virtual-options.tsx:174` | Both docs callers pass an inline `getOptionId`, so the `source` memo and its effect run on each render. | Wrap the three option callbacks in `useStableEvent` for `source` only. `getItemKey` keeps the raw `getOptionId`, because the virtualizer calls it in render. The saving is small. | None | B | No | Open |
| C8 | `hooks/use-hover-across-scroll.ts:57`; `hooks/use-truncation.ts:271` | Each hover instance adds two window listeners, so a dashboard with N charts runs 2N listeners on each move and scroll. Each truncation instance adds `pointerover` and `focusin` to its node, two for each grid cell, and a virtual scroll adds and removes them for each recycled cell. | One shared listener for each, with a `WeakMap` from target to handler, as the `ResizeObserver` pool in `use-truncation.ts` does. `subscribeDocumentEvent` is bubble-phase on `document` only, so the hover half needs a capture variant in `utilities`. Needs a browser test for the reveal order. | None expected | C | No | Open |
| C9 | `modules/chart/engine/use-chart-text-width.ts:168` | Each instance adds its own `document.fonts` `loadingdone` listener in a layout effect that does no layout work, and the reset costs one more render. A dashboard of charts adds many listeners. | One module-level font epoch, read through `useSyncExternalStore` with a server snapshot of `0`. Keep the epoch in `measured` and give `NONE` in render when it differs, as the code does for `className`. | None | C | No | Open |
| C10 | `components/calendar/use-calendar-today.ts:36` | Each calendar arms its own midnight timer and its own `visibilitychange` subscription. | One module-level store read through `useSyncExternalStore`, with a server snapshot of `null`, which also replaces the `useHydrated` gate. The gain is small, because a DatePicker mounts its calendar only while it is open. | None | C | No | Open |

## 6. Docs app

The docs app is not library surface. Each row starts a timer from an effect that watches a flag, and an event handler sets the flag. The timer can move into the handler with `useTimeout`, and a `pending()` guard keeps the current rule that the timer does not start again.

| ID | Where | Current | Proposed change | Behavior | Class | Start | Status |
|---|---|---|---|---|---|---|---|
| X1 | `docs/app/router-link.tsx:52` | `start` sets `intent`, and an effect on `intent` starts a 100 ms prefetch timer. A hover on one of about 100 sidebar links renders the link two times. | `start` calls `if (!timeout.pending()) timeout.set(() => setPrefetch(true), 100)`. `cancel` clears the timer. Delete `intent` and the effect. | None: one render less on each intent | A | Yes | Fixed in #2230 |
| X2 | `docs/pages/modules/grid/sorting/server-side-sorting.tsx:33` | An effect on `sort` starts a 600 ms timer in place of a request. | Start the timer in `onValueChange`. The demo then shows the handler form for a server request. | None | A | Yes | Fixed in #2230 |
| X3 | `docs/pages/components/tooltip/held-open.tsx:14` | The click sets `copied`, and an effect on `copied` starts a 1.5 s clear timer. | Start the timer in the `.then` of the click, with a `pending()` guard. | None | A | Yes | Fixed in #2230 |

## 7. Kept effects that look like a finding

These groups have the shape of a finding, but each has a reason to stay. Do not convert them under the rules above.

- **A latest ref that render reads.** `hooks/use-controllable.ts:52` and `hooks/use-floating-disclosure.ts:142`: a caller sets the value during render (`useTooltipState`), and a stable event throws there. `components/form/use-form-reducer.ts:186`: the reducer calls the validator in render. `components/accordion/use-accordion-selection.ts:140` and `components/combobox/use-combobox-state.ts:109`: the event also writes the ref, for two calls in one batch. `components/code/code-block.tsx:302`: the ref is the newest input of a tokenizer queue, not a handler.
- **Value refs with more than one writer or an order contract.** `modules/grid/use-grid-editing.ts:603`, `use-grid-data-cursor.ts:119`, `use-grid-cursor.tsx:301`, `use-grid-item-window.ts:188`, and `modules/map/use-map-zoom.ts:210`.
- **Effects that find the cell from store state.** `modules/grid/grid-nav-cell.tsx:71, 85, 97` use `closest('[role="gridcell"]')` as R2 does, but they depend on store state, so they stay effects.
- **Pre-paint measures and writes.** The grid window, sticky head, pinned offsets, and column sizing; `use-plot-frame`; `use-virtual-window`; the PdfViewer viewport size, where `useResizeObserver` is passive and does not fit; and the dashboard props that sync into its store.
- **A report that a render must not make.** `components/date-input/date-input.tsx:233` and `components/credit-card-input/credit-card-input-expiry.tsx:183` clear during render and report from an effect. The two files repeat one pattern, and a small shared hook can hold it (class C).

## 8. Adjacent leads

These leads are outside the effect lens. No sweep verified them. Each needs its own thread if the owner wants it.

- `hooks/use-resize-observer.ts:17`, `hooks/use-in-view.ts:63`, and `hooks/use-is-truncated.ts:34` read `ref.current` in a mount effect. When a caller swaps the node and does not remount, the observer stays on the old node. `use-plot-frame.ts` documents this fault and keeps its node in state. No caller is known to swap the node.
- `components/scroll-area/use-scroll-area-scrollbar.ts:160` measures the thumbs in a passive effect. With `scrollbar="visible"`, the first paint can show no thumb.
- `components/tabs/use-tab-list-scroll.ts:89` scrolls a deep-linked tab into view in a passive effect, so the first paint can show the list at scroll 0.
- `components/toolbar/toolbar.tsx:56-58` marks the row edges again only on a resize or an orientation change, so an added separator with no size change can leave the edges stale.
- The TSDoc of `components/password-confirm/use-password-confirm-state.ts` says that `onMatchChange` "is read through a ref", but the code uses `useEffectEvent`.

## 9. Recommended start

Each group below applies one rule and holds only rows of class A that are marked *Start: Yes*. The groups touch different files, so they can run in parallel. Each group runs `biome check .`, `turbo run check-types`, the related Vitest files under jsdom, the browser suite, and `test:compiler`.

1. **Latest ref to `useStableEvent`:** L1 to L8. Eight files, one rule (CONVENTIONS §10.8).
2. **Hand-kept timers to `useTimeout`:** H1 to H4.
3. **Map listener churn:** C1. One file, and the only row that also removes a latent fault.
4. **Ref callbacks for a node:** R1 and R2. R3 can join if the owner accepts the earlier scroll.
5. **Small one-file changes:** H5, H6, E1, E2, C2, and C3.
6. **Docs app timers:** X1 to X3.

The class B rows need a test first, and each can take its own thread after the groups above. The class C rows wait for a decision from the owner.
