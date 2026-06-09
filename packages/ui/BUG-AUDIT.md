# packages/ui Correctness Bug Audit

_Generated 2026-06-08 via a multi-agent audit: 169 targets (every component, primitive, hook, provider, and core area), each given an independent find pass plus an adversarial verify pass that re-read the source to refute weak findings. 127 candidates → **106 confirmed**, 18 rejected as false positives, 3 uncertain. `turbo run check-types --filter=ui` is clean, so there are no type-level errors; everything below is runtime/logic._

> **Verification note:** Five High findings were hand-checked against source after the run — `alert.tsx`, `tabs/tab.tsx`, `dl/description-list.tsx`, and `slider/range/use-range-update.ts` verified exactly. The **"Textarea drops `ref`"** finding was **overstated**: under React 19 `ref` is a regular prop, so a consumer `ref` still forwards to the `<textarea>` via `{...rest}` (`textarea.tsx:136`). The real defect is a **type-level API gap** — `TextareaProps` omits `ref` from its public type (unlike every sibling leaf, e.g. `input.tsx:28`), so typed consumers can't pass one. Reclassified **Low**. Treat other ref/spread findings with the same React-19 lens before fixing.

## Executive summary

**106 confirmed correctness bugs (14 High, 54 Medium, 38 Low)** plus 3 uncertain. The library is functionally solid on default/happy paths but exhibits two pervasive structural weaknesses: **prop-spreading order** (internal handlers/a11y wiring written before `{...props}`, so consumer props silently clobber them) and **a11y id wiring** (slots register a presence boolean and compose a *generated* id while the rendered element carries a consumer-supplied `id`, producing dangling `aria-*` references). The highest-leverage themes: (1) controlled/uncontrolled state desync — several controls ignore the driving prop or seed state from the wrong source; (2) keyboard handlers on container elements hijack keys from focusable descendants without a `target === currentTarget` guard; (3) layout/measurement hooks (ResizeObserver, layout effects) miss content/prop changes after mount. The single most dangerous defects are the irreversible-action paths: `HoldButton` fires `onComplete` after focus loss, and `DescriptionList` crashes in RSC for lack of a `'use client'` directive.

## Confirmed findings

### Critical

None.

### High

✅ **Controlled-without-handler dismissal is permanent** — `components/alert/alert.tsx:127-153,201`. `<Alert open closable>` with no `onOpenChange` sets a sticky `locallyDismissed` flag on close that nothing ever resets, so line 153 returns null permanently and the `open` prop is silently ignored thereafter. Fix: add an effect on `openProp` that clears the flag.

**Non-ASCII digit locales wipe the value on edit** — `components/currency-input/currency-input-utilities.ts:28-49,78,85-89`. `\d`/`>='0'&&<='9'` assume ASCII, but `displayFormatter` renders native digits for ar-EG/fa-IR/ne-NP, so the first edit strips every digit and `setNum(undefined)` destroys the value. Fix: normalize native digits to ASCII (or force `-u-nu-latn`) before parsing.

**Column reorder drops selection/actions columns** — `components/data-table/data-table-column-manager.tsx:85-108`. `handleReorder` walks the full `order` but a filtered `byId`, so `if (!col) continue` discards the select/actions ids; they jump to the table end and persist into saved presets. Fix: preserve unmatched ids in place.

**DescriptionList crashes in RSC (missing `'use client'`)** — `components/dl/description-list.tsx:1-29`. Renders a client Context Provider with no `'use client'` directive; subpath imports resolve to raw source (not the tsup-bannered dist), so it executes server-side and Next rejects it. Fix: add `'use client'` to line 1.

**Numeric/currency editors drop the first typed character** — `components/editable-grid/use-editable-grid-numeric-editor.ts:28-44`. Editor seeds `value` from `row[column.field]` and ignores the grid `draft`, so type-to-edit shows the old value selected and loses the typed key. Fix: seed from `draft` like the text editor.

**FiltersField toggle controls never reflect filter state** — `components/filters/filters-field.tsx:118-127`. Clones Checkbox/Switch with `value`/`onChange` but they read `checked`; never passing `checked` leaves them uncontrolled, desynced from the filter value. Fix: pass `checked` for toggle-type controls.

**Keyboard hold never cancels on focus/window loss** — `components/hold-button/hold-button.tsx:73-82`. Hold starts on keydown, cancels only on a keyup on the same button; Tab/Alt-Tab mid-press routes keyup elsewhere, so the irreversible `onComplete` still fires. Fix: add blur/window-blur/visibilitychange cancel.

**Virtualized JsonTree never auto-expands search matches** — `components/json-tree/json-tree-utilities.tsx:195-210`. `open = expanded.has(path)` and `flattenTree` returns early on closed branches; nothing seeds matching paths into `expanded`, so the documented auto-expand contract is broken in virtualized mode. Fix: seed/expand search-matching branch paths.

**List-item keyboard handler hijacks Space/Arrow/Home/End from descendants** — `components/list/list-item.tsx:37`. `onKeyDown` lacks a `target === currentTarget` guard; bubbled keystrokes from inner buttons/inputs are treated as reorder gestures and `preventDefault`'d. Fix: guard on event source.

**User onBlur clobbers NumberInput clamp/round/setTouched** — `components/number-input/number-input.tsx:122,151`. `onBlur` isn't in the Omit list and `{...props}` spreads after `onBlur={handleBlur}`, so a consumer `onBlur` wins and the documented clamp/round-on-blur and form `setTouched` never run. Fix: merge handlers or spread props before internal wiring.

**Consumer onScroll clobbers ScrollArea handleScroll** — `components/scroll-area/scroll-area.tsx:61-68`. `onScroll={handleScroll}` precedes `{...props}` (which retains `onScroll`), so a consumer handler disables thumb tracking and auto-fade. Fix: compose the handlers.

**Range slider clamps before snapping → value > max** — `components/slider/range/use-range-update.ts:17`. `snapToStep(clamp(raw))` can round past max with no re-clamp (e.g. min=2,max=10,step=3, End → 11), producing `aria-valuenow > aria-valuemax` and a thumb past the track. Fix: clamp after snapping.

**Tab drops all button props except onClick** — `components/tabs/tab.tsx:24-99`. Type advertises the full button surface but the component forwards a fixed set with no `...rest`; `aria-label`, `data-testid`, `onFocus`/`onKeyDown`, `title`, etc. vanish (icon-only tabs lose their accessible name). Fix: collect and forward `...rest`.

**Floating sidebar hover-peek traps keyboard focus** — `layouts/sidebar/sidebar.tsx:81-112`. Pointer-hover over a 2px hot zone opens a modal `Sheet`/`Overlay` whose `FloatingFocusManager modal` has no opt-out, stealing/trapping focus on mere hover. Fix: render the hover-peek non-modal (no focus trap).

### Medium

_Progress (session `claude/ui-medium-bugs-audit-bvc421`): 42 of 53 fixed, marked ✅ below. Unmarked items are either left to the High-bugs session or its active files (FiltersField, useControllable, floating sidebar, JsonTree Tab, polite toasts), tractable-but-not-yet-done (Calendar `initialFocus`, ScrollArea ResizeObserver), or the risky/public-API tail (Grid `span='full'`, List `getKey`, use-pending-caret ×2)._

✅ **AccordionTrigger props clobber a11y wiring** — `components/accordion/accordion-trigger.tsx:35-46`. `{...props}` spreads after `id`/`aria-*`/`disabled`/`data-slot`, so a consumer `id` orphans the panel's `aria-labelledby`; `data-slot`/`disabled` overrides break roving-tabindex and context-disabled. Fix: spread props before internal wiring.

✅ **Address suggestions spinner stuck on after close** — `components/address-input/use-address-input-suggestions.ts:35-92`. When `enabled` flips false mid-flight, the effect early-returns before `setLoading(false)`, leaving a perpetual spinner on the closed field. Fix: reset loading in the disabled branch/cleanup.

✅ **Address menu reflickers on every keystroke** — `components/address-input/use-address-input-suggestions.ts:50-52`. `setReady(false)` fires synchronously per keystroke, driving `open` false and unmounting the panel until the debounced fetch resolves. Fix: don't collapse `ready` while results are showing.

✅ **Calendar picker state not reset on imperative open** — `components/calendar/use-calendar-picker.tsx:105-112`. The `open` reducer reset only fires from the Popover's `onOpenChange`; `openPicker()` bypasses it, reopening with stale view/year and navigating wrong on month select. Fix: reset reducer when `pickerOpen` transitions true.

✅ **System chat message announced as "Assistant said"** — `components/chat-message/chat-message.tsx:32`. The author-label ternary only distinguishes `user`; `type="system"` falls to the assistant branch, mis-attributing system status lines. Fix: handle/omit the prefix for `system`.

✅ **CodeBlock renders stale highlighted markup during re-tokenization** — `components/code/code-block.tsx:57-105`. On a cache-miss `code`/`lang`/`theme` change, `html` is never reset, so the previous snippet's markup renders for the full async duration instead of the plain fallback. Fix: reset `html` on input change.

✅ **ColorEyedropper SSR/client hydration mismatch** — `components/color/color-eyedropper.tsx:22-27`. `window.EyeDropper` is read during render → null on server, `<Button>` on first Chromium client render. Fix: defer the check to a mount effect.

✅ **Combobox hijacks Home/End from the editable input** — `components/combobox/use-combobox-input.ts:74-95`. Only Escape/Enter are intercepted; Home/End fall through to roving and `preventDefault` the caret jump. Fix: let Home/End reach the textbox (or guard when caret-navigable).

✅ **CopyButton drops focus on copy and never restores it** — `components/copy-button/copy-button.tsx:52`. Setting `disabled` on copy blurs the button to `<body>` for the timeout and never refocuses. Fix: refocus on re-enable (or use aria-disabled).

✅ **CVV not re-truncated when brand shrinks max length** — `components/credit-card-input/credit-card-input-cvv.tsx:58-68`. `format` runs only on change/seed; an amex→visa brand change leaves a stored 4-digit CVV displayed under maxLength=3 and a stale validity. Fix: re-format the stored value when `maxLength` changes.

**Calendar dialog opens focused on "Previous month"** — `components/date-picker/date-picker-content.tsx:55-65`. `FloatingFocusManager` is `modal` with no `initialFocus`, so floating-ui's default lands on the first tabbable (the prev-month button) instead of the grid. Fix: set `initialFocus` to the selected/today day.

✅ **Description custom `id` → dangling `aria-describedby`** — `components/fieldset/description.tsx:22-30`. Registration composes `control.descriptionId` while the element renders `id ?? control.descriptionId`; a custom id orphans the reference. Fix: register/compose the rendered id.

✅ **Message custom `id` → dangling `aria-describedby`** — `components/fieldset/message.tsx:49-59`. Same mechanism for the error slot's `messageId`. Fix: as above.

✅ **Label custom `id` → dangling `aria-labelledby`** — `components/fieldset/label.tsx:23-31`. Same mechanism; portalled listbox/combobox popups read `control.labelledBy` and end up unnamed. Fix: as above.

✅ **File input reset to '' defeats native `required`** — `components/file-upload/use-file-upload-handlers.ts:48-57`. `e.target.value = ''` (for same-file reselect) empties the FileList, so a `required` hidden input fails native validation on submit despite a valid pick. Fix: track validity independently of the cleared input.

**FiltersField overwrites a Radio's `value`** — `components/filters/filters-field.tsx:120-127`. A cloned Radio gets `value={fieldValue}` (clobbering the author's option value) and never gets `checked`. Fix: don't overwrite `value` for radios; drive `checked`.

**Grid `span='full'` + start overflows the parent** — `components/grid/variants.ts:174-178`. With columns set, `full` emits `col-span-N`; from a non-default start CSS spans N tracks past the grid edge instead of clamping. Fix: clamp end to the grid's last line.

✅ **Group produces duplicate React keys across fragment boundaries** — `components/group/use-group.ts:24-69`. Flattening hoists fragment children into one list keyed by literal `child.key`, colliding keys that were unique per scope. Fix: namespace keys by depth/index.

✅ **Group silently drops non-element children** — `components/group/use-group.ts:27-37`. Text/number children fail `isValidElement` and are excluded from the rendered output. Fix: preserve non-element children in place.

✅ **Matched JsonTree branch can't be collapsed during search** — `components/json-tree/json-tree-node.tsx:57-97`. `search && hasMatch` force-opens `open=true` over `userOpen`, so the toggle is a permanent no-op. Fix: let `userOpen` override the force-open after user interaction.

**Virtualized JsonTree unreachable by Tab when root scrolls out** — `components/json-tree/json-tree-branch-header.tsx:41`. Tab stop is hardcoded to `depth===0`; without `manageTabIndex` the roving hook never re-seats it, so scrolling the root row out of the virtual window leaves no `tabIndex=0`. Fix: enable `manageTabIndex` or seat a stop on a mounted row.

✅ **Kanban arrow nav can't cross an empty column** — `components/kanban/use-kanban-keyboard.ts:110-125`. `focusNeighbor` inspects only the immediate neighbor; an empty adjacent column returns false and stops. Fix: skip empty columns to the next populated one.

**List index-key fallback remounts items on reorder** — `components/list/use-list-drag.ts:22-32`. The types permit `sortable=false` + `onReorder` with no `getKey`, yielding positional keys that change on reorder, breaking drag continuity and keyboard-move refocus. Fix: require `getKey` when `onReorder` is set.

✅ **MapMarker ignores className/anchor changes after mount** — `components/map/map-marker.tsx:49-96`. Only `position` is synced post-mount; className/anchor are read once at creation despite the comment. Fix: add effects re-applying className/anchor.

✅ **Map route segments mis-colored when `path` is supplied** — `components/map/map-route-utilities.ts:12-43`. The loop indexes `stops[i]`/`stops[i+1]` by dense path-segment index, so a completed route renders mostly `pending`. Fix: map path segments to stops by distance/stop boundaries, not path index.

✅ **MenuItem onClick/onKeyDown clobbered by consumer handler** — `components/menu/menu-item.tsx:68-79,90-110`. Internal `handleSelect`/`onKeyDown` precede `{...rest}`, so a consumer `onClick` drops `onAction` and leaves the menu open (live consumer: `shared/.../sidebar-user-menu.tsx:45`). Fix: compose handlers like MenuTrigger does.

✅ **`disabled` fails to suppress onPasswordMatch (and swallows the later real match)** — `components/password-confirm/use-password-confirm-state.ts:43-63`. The `match` branch isn't gated by `disabled`, so it fires while disabled; `prevMatchState` then blocks the legitimate match after re-enable. Fix: gate the match branch on `disabled`.

✅ **PDF rotation state not reset on document change** — `components/pdf-viewer/use-pdf-viewer-page-rotation.ts:24-34`. The page→degrees map survives a `src`/`pages` swap on the same instance, rotating the new doc's pages. Fix: clear rotations on document change.

✅ **Skeleton drops silhouette class for xs/xl under affix cascade** — `components/placeholder/placeholder-skeleton.ts:54-61`. `useSize` resolves a wide `Ma` value (e.g. `xs` from a Button/Input affix) that indexes a Step-keyed map (`sm`/`md`/`lg`), yielding undefined with no defaults fallback. Fix: fall back to the recipe's default size when out of range.

✅ **Query-builder date round-trips through UTC, shifting the day** — `components/query-builder/query-builder-rule-value.tsx:58-67`. `toISOString().slice(0,10)` serializes local-midnight to UTC and `new Date(str)` parses YYYY-MM-DD as UTC, drifting ±1 day off-UTC. Fix: serialize/parse using local date components.

✅ **Resizable keyboard resize runs side effects inside the setSizes updater** — `components/resizable/use-resizable-panel.ts:120-135`. The updater mutates `sizesRef` and calls `onSizesChange`; StrictMode double-invokes it, firing the callback twice per keypress. Fix: run side effects outside the updater (as the drag path does).

**ScrollArea ResizeObserver misses child add/remove** — `components/scroll-area/use-scroll-area-scrollbar.ts:57-71`. Observes only mount-time children; a viewport RO doesn't fire on its own scrollHeight change, so dynamic content leaves a stale thumb. Fix: add a MutationObserver or re-subscribe on child changes.

✅ **SignaturePad stroke style changes only apply on resize** — `components/signature-pad/use-signature-pad-canvas-sizing.ts:32-68`. `configureStroke` runs only inside `resize` (fired by ResizeObserver), so runtime `strokeColor`/`strokeWidth` changes don't reach drawn segments (dot vs line mismatch). Fix: re-apply stroke config when those props change.

✅ **Stack renders items-stretch instead of items-start** — `components/stack/stack.tsx:15-20`. Composing `FlexBase` directly skips Flex's `defaultAlignFromDirection('col') → 'start'`, so auto-width children stretch. Fix: apply the column align default.

✅ **Stepper aria-controls dangles when panels are omitted** — `components/stepper/stepper-step.tsx:94-96`. The current step always emits `aria-controls={panelId}`, but the supported panels-free mode renders no panel. Fix: only emit when a panel is rendered.

✅ **Uncontrolled Switch ignores native form reset** — `components/switch/switch.tsx:40-87`. Switch always renders as React-controlled (`checked={on ?? false}`), so a native `type=reset` doesn't fire onChange and the value stays stale (Checkbox stays genuinely uncontrolled). Fix: leave the input uncontrolled when neither `checked` nor a binding is supplied.

_(Reclassified **Low** after verification — see note at top.)_ **Textarea omits `ref` from its public type** — `components/textarea/textarea.tsx:16-21`. `TextareaProps` doesn't declare `ref` (every sibling leaf does, e.g. `input.tsx:28`), so typed consumers can't pass one for focus/selection/measurement. At runtime a forced `ref` still forwards via `{...rest}` (`textarea.tsx:136`) under React 19. Fix: add `ref?: Ref<HTMLTextAreaElement>` to the type and destructure it onto the `<textarea>` for parity.

✅ **TimeAgo rolls past its own unit boundary** — `components/time-ago/use-time-ago-relative-time.ts:25-39,109-111`. Unit chosen by the bucket's lower edge but magnitude is `Math.round`, yielding "60 seconds ago"/"24 hours ago"/"7 days ago" on the common live-refresh path. Fix: roll over to the next unit when the rounded value reaches its threshold.

✅ **TimeAgo `interval={0}` → render storm** — `components/time-ago/use-time-ago-relative-time.ts:87,95`. Typed `number | 'auto'` with no lower-bound clamp; `setInterval(fn, 0)` fires continuously. Fix: clamp the interval to a sane floor.

✅ **Toast onMouseLeave resumes timer while focus is still inside** — `components/toast/toast-alert.tsx:77-85`. `onResume` is unconditional (unlike the focus-guarded `onBlur`), so moving the pointer off while focus stays inside auto-dismisses under a keyboard user (WCAG 2.2.1). Fix: skip resume when focus remains within the toast.

**Polite toasts likely never announced** — `components/toast/toast-alert.tsx:76-98`. ToastAlert sets `role` on its own wrapper and omits `severity`, bypassing Alert's persistent-announcer mitigation, so role=status toasts inserted with their text aren't reliably announced. Fix: route polite toasts through the shared announcer.

✅ **Tree arrow/Home/End jumps from prefix/suffix controls** — `components/tree/tree.tsx:29-33`. With `focusOnEmpty:true`, a focused prefix control makes `indexOf(activeElement) === -1`, so the fallback sends ArrowDown to the first item. Fix: guard the empty-focus fallback when focus is on a descendant control.

✅ **Height observer measures only first data-current child** — `primitives/current/use-current-contents-height.ts:26-36`. When `context.value` is undefined every panel is `data-current` and stacked, but height tracks only the first → the others are clipped. Fix: measure the union/max of all current panels (or guard the undefined-value case).

✅ **Panel Title/Description custom `id` breaks dialog aria wiring** — `primitives/panel/panel.tsx:84,101`. Registration composes the generated `titleId`/`descriptionId` while the element renders `id ?? titleId`; a custom id leaves the dialog's `aria-labelledby`/`describedby` dangling (and suppresses the `aria-label` fallback). Fix: adopt the rendered id during registration.

✅ **Hidden ReadyReveal layer stays keyboard-focusable** — `primitives/ready-reveal/ready-reveal.tsx:37-54`. The hidden layer uses only opacity/blur/pointer-events/aria-hidden — focusable descendants remain Tab-reachable inside an aria-hidden subtree. Fix: apply `inert`/`visibility:hidden` to the hidden layer.

**useControllable collapses batched functional updates** — `hooks/use-controllable.ts:41-53`. The uncontrolled setter resolves a functional updater against a render-stale `valueRef` instead of threading `prev => ...` into `setInternalValue`, so two updates in one batch lose the first (e.g. `toggleRow(a)` then `toggleRow(b)`). Fix: pass the functional updater to `setInternalValue`.

✅ **Frozen selection snapshot never clears on interrupted exit** — `hooks/use-deferred-toggle.ts:51-66`. `flushPending` is wired only to `onExitComplete`, which motion v12 skips when the exit is interrupted by reopen, pinning `selectionValue` to the pre-selection value (wrong row painted/announced selected). Fix: clear the freeze on reopen.

✅ **Page-scroll closes floating panels (root scrollbar press)** — `hooks/use-floating-ui.ts:62-81`. The custom `isScrollbarPress` drops floating-ui's `isLastTraversableNode` term, so a press on the html/body root scrollbar (computed overflow `visible`) isn't recognized and closes the panel. Fix: OR in `isLastTraversableNode(target)`.

**Pending caret applied to a later unrelated render** — `hooks/use-pending-caret.ts:21-33`. The dependency-free layout effect consumes `pendingCaretRef` on every render; if the intended render doesn't commit (controlled consumer rejects the value), the stale caret misfires later. Fix: tie the pending caret to a specific render/version.

**Controlled input with unchanged value never re-applies caret** — `hooks/use-pending-caret.ts:21-37`. When the controlled value doesn't change, no commit fires the effect, so the cursor jumps to the end — exactly what the hook claims to prevent. Fix: apply the caret without requiring a commit.

✅ **Scrollable-ancestor search matches overflow style without checking it scrolls** — `hooks/use-scroll-within.ts:13-23`. Stops at the first `overflow:auto` ancestor without `scrollHeight > clientHeight`, so a non-overflowing wrapper is chosen and `scrollTo` no-ops (`block:'nearest'` callers fail to reveal items). Fix: verify actual scrollability.

✅ **Slot presence is a boolean, not a refcount** — `hooks/a11y/use-a11y-scope.ts:59-71`. Two same-id slot instances share one boolean; unmounting one drops the id from `aria-describedby`/`labelledby` while the other is still mounted. Fix: reference-count slot presence.

✅ **New toast restarts auto-dismiss while one is hovered/focused** — `providers/toast/toast.tsx:104`. The push path calls `startTimer()` unconditionally (unlike the guarded `reset`), arming a live timer despite `pausedRef=true` (WCAG 2.2.1). Fix: skip `startTimer` when paused.

**Floating sidebar hover locks body scroll** — `layouts/sidebar/sidebar.tsx:93-112`. The container-less Sheet computes `scoped=false`, so hovering the hot zone calls `useScrollLock(true)`, locking page scroll and padding the body. Fix: scope the sheet or skip scroll lock for the hover-peek.

### Low

✅ **Controlled single Accordion churns context identity each render** — `components/accordion/accordion.tsx:49-108`. `toArray(props.value)` allocates a new array per render, defeating the context `useMemo` and re-rendering every item. Fix: memoize the wrapped value.

✅ **Avatar duplicate accessible name (src + initials + alt)** — `components/avatar/avatar.tsx:55-75`. Both the initials svg (role=img) and the img carry the same `alt`, announced twice. Fix: aria-hide the fallback when the image is present.

✅ **Avatar status branch splits props vs className across nodes** — `components/avatar/avatar.tsx:48-92`. With `status`, `{...props}` lands on the inner span but `className` on the wrapper, so `#id.class` matches nothing and clicks on the dot/padding miss `onClick`. Fix: apply props and className to the same element.

✅ **BottomNav misroutes className to inner NavList** — `components/bottom-nav/bottom-nav.tsx:8-15`. Type declares className for the `<nav>` landmark but it's applied to the `<ul>`. Fix: forward className to the nav.

**Calendar pickerYear stale after month nav while closed** — `components/calendar/use-calendar-picker.tsx:71-112`. Reducer re-syncs to `year` only on an `open` dispatch; header chevrons change `year` while closed, so a non-trigger open shows the mount-time year. Fix: sync reducer on `year` change (shares root cause with the imperative-open bug).

**Day cell aria-label ignores configured locale** — `components/calendar/calendar-day-cell.tsx:41-50`. Uses `toLocaleDateString(undefined, …)`; `localeTag` is never threaded down, so day announcements use the browser locale. Fix: pass `localeTag` to the cell.

**Calendar viewDate seed reads `new Date()` during render** — `components/calendar/use-calendar-month.ts:18-22`. The lazy initializer can land in different months on server vs client near a month boundary (the sibling `today` is deferred to avoid exactly this). Fix: defer the seed to a mount effect.

**Card padding-collapse selector catches content slots** — `components/card/card.tsx:47`. `[&:has(>[data-slot^=card-])]:p-0` matches `card-title`/`card-description`, which supply no padding, so `<Card><CardTitle/><CardDescription/></Card>` renders flush. Fix: target only structural slots.

**Combobox virtual highlight not re-anchored when options change for same query** — `components/combobox/combobox.tsx:215-231`. The re-anchor effect keys on `deferredQuery`; async option swaps for an identical query leave `aria-activedescendant` pointing at an unmounted id. Fix: re-anchor on option-set change.

**CommandPaletteItem onClick clobbers selection/close handler** — `components/command-palette/command-palette-item.tsx:44-66`. `optionProps` (with `onClick: handleSelect`) spreads before forwarded props, so a consumer `onClick` drops `onAction`/`close`. Fix: compose handlers / spread internal last.

**Range DatePicker never forwards aria-required** — `components/date-picker/date-picker-range.tsx:24-41`. `useDatePickerRangeState` omits `required`, so a range picker in a required Control isn't announced as required (the single variant is). Fix: forward `control?.required`.

**Multi-error Message keyed by error text** — `components/fieldset/message.tsx:75-77`. Duplicate identical messages (native validator path doesn't dedupe) collide React keys. Fix: key by index.

**HoldButton: releasing one of two held keys cancels the hold** — `components/hold-button/hold-button.tsx:78-82`. keyup cancels for any Space/Enter without tracking which key started. Fix: track the initiating key.

**Icon numeric size overwrites the source icon's inline style** — `components/icon/icon.tsx:33-43`. `cloneElement` replaces `style` wholesale (className is carefully re-merged; style isn't). Fix: merge the source `style`.

**Input hasAffix `!== undefined` vs truthy render guards** — `components/input/input.tsx:121-155`. A falsy-but-defined prefix/suffix (`false`/`null`/`0`) sets `hasAffix` but renders no affix; `prefix={0}` emits a raw `0`. Fix: align the checks (use truthiness or normalize).

**Controlled JsonTree without onExpandedChange swallows clicks** — `components/json-tree/json-tree-node.tsx:91-97`. `expanded` set with no handler makes `toggle` write dead `userOpen` state; clicks no-op. Fix: warn or update internal state.

**Kanban column section emits dangling aria-labelledby without a title** — `components/kanban/kanban-column.tsx:44-45`. The labelledby id is emitted unconditionally when no `aria-label`, but only KanbanColumnTitle renders it. Fix: only reference the id when the title is rendered.

**NumberInput scientific-notation step → precision 0** — `components/number-input/number-input.tsx:67`. `step={1e-7}.toString()` is `'1e-7'`, so `split('.')[1]` is undefined and values snap to integers. Fix: compute precision without relying on decimal string form.

**NumberInput round-after-clamp can exceed min/max** — `components/number-input/number-input.tsx:69,79,108`. Rounding a clamped value to coarser step precision can re-cross the bound (max=0.06,step=0.1 → 0.1). Fix: clamp after rounding.

**PasswordConfirm confirmName/confirm not reset on unmount** — `components/password-confirm/password-confirm-input.tsx:14-16`. The register effect has no cleanup and parent `confirm` isn't cleared, leaving a stale warning. Fix: add cleanup clearing confirmName/confirm.

**onStrengthChange fires on every keystroke (passedIds identity churn)** — `components/password-strength/use-password-strength.ts:57-74`. `passedIds` is a fresh array per value change, defeating the deps guard despite unchanged scoring. Fix: gate on value, not array identity.

**PDF defaultRotation not snapped to 90** — `components/pdf-viewer/use-pdf-viewer-page-rotation.ts:26-33`. Documented to snap but never rounded; `defaultRotation={45}` mis-sizes/clips. Fix: snap to the nearest multiple of 90.

**ProgressGauge renders empty positioned span for label={false}** — `components/progress/progress-gauge.tsx:46-94`. `resolvedLabel != null` is true for `false`, mounting a styled empty span. Fix: guard `label !== false`.

**ProgressBar value={NaN} renders aria-valuenow="NaN", width "NaN%"** — `components/progress/progress-bar.tsx:30-49`. `NaN != null` is treated determinate and clamp yields NaN (same in ProgressGauge). Fix: treat NaN as indeterminate/0.

**clampPair leaves left unclamped after second-pass reassignment** — `components/resizable/use-resizable-panel.ts:34-50`. Over-constrained min/max lets the right clamp push left below its min. Fix: re-clamp left after reassignment.

**Shift+wheel hijacked from a horizontal viewport** — `components/scroll-area/use-scroll-area-scrollbar.ts:85-96`. shift+wheel always forwards to an outer ancestor (viewport excluded), breaking shift-to-pan on horizontal scroll-areas. Fix: don't hijack when the viewport itself scrolls horizontally.

**Stack forces gap-md outside any Density provider** — `components/stack/stack.tsx:18`. Hardcoded `'md'` fallback diverges from Flex (no fallback) and the documented unset contract; JSDoc also wrongly says `'lg'`. Fix: drop the fallback (and fix the doc).

**Consumer aria-checked/role clobbers Switch's synced value** — `components/switch/switch.tsx:86-93`. `{...props}` spreads after `aria-checked`/`role`, letting a consumer desync AT state. Fix: spread props before, or omit these from the type.

**Inactive auto tabs omit aria-controls though fade panels stay mounted** — `components/tabs/tab.tsx:85`. Default `fade=true` keeps inactive panels mounted, but inactive tabs suppress `aria-controls`. Fix: emit aria-controls when the panel exists.

**TagInput refocusOnMaxRelease flag leaks in controlled mode** — `components/tag-input/tag-input.tsx:73-89`. If the parent rejects the update, `atMax` never flips, leaving the flag set to steal focus on a later unrelated transition. Fix: clear the flag when removal is observed (not on transition only).

**TagInput duplicate controlled values collide keys** — `components/tag-input/tag-input.tsx:122-124`. `value={['a','a']}` produces colliding `key={t}`. Fix: key by index/stable id.

**TimelineMarker accepts `current` but discards it** — `components/timeline/timeline-marker.tsx:16-32`. Public prop is destructured to `_current` and never used. Fix: implement or remove it from the type.

**Tooltip disabled detection misses the reference element itself** — `components/tooltip/use-tooltip-state.ts:42,67`. `querySelector(':disabled')` only matches descendants, but the reference IS the disabled control; contradicts the documented child/fieldset cases. Fix: use `matches(':disabled')`.

**Fade-mode CurrentContent overwrites caller `style`** — `primitives/current/current-content.tsx:46-62`. Internal `style` is set after `{...props}` in fade mode (non-fade preserves it). Fix: merge caller `style`.

**Height observer uses content-box, under-sizing the container** — `primitives/current/use-current-contents-height.ts:21-23`. `contentRect.height` excludes panel padding/border, clipping the bottom under overflow-hidden. Fix: use `borderBoxSize`/`offsetHeight`.

**scroll-within offset uses border-box top vs padding-box scroll metrics** — `hooks/use-scroll-within.ts:25-31`. With a top border, offset is overstated by `clientTop`, over-scrolling and miscalibrating the nearest check. Fix: subtract `scroller.clientTop`.

**moveItem treats a valid `undefined` element as failure** — `utilities/move.ts:9-12`. `item === undefined` conflates out-of-range with a legitimately stored `undefined`, returning null. Fix: check the index range, not the value.

**moveItem accepts a negative `from`** — `utilities/move.ts:9`. `splice` reads negatives from the end instead of returning null per contract. Fix: guard `from < 0`.

## Systemic patterns

These classes recur across many files and are the highest-leverage fixes:

**Internal handler/attribute clobbered because `{...props}`/`{...rest}` spreads after the internal value.** A consumer-supplied prop with the same name silently wins. Affected: `number-input.tsx:122,151` (onBlur), `scroll-area.tsx:61-68` (onScroll), `accordion-trigger.tsx:35-46` (id/aria/disabled/data-slot), `menu-item.tsx:68-110` (onClick/onKeyDown), `command-palette-item.tsx:44-66` (onClick/tabIndex), `tab.tsx:24-99` (drops all but onClick), `switch.tsx:86-93` (aria-checked/role), `current-content.tsx:46-62` (style), `icon.tsx:33-43` (style via cloneElement), `floating-surface.tsx:46-52` (uncertain). The fix is uniform: merge same-named handlers and place internal wiring after the spread (the established MenuTrigger pattern at `menu-trigger.tsx:53-60`).

**a11y slot id wiring composes a generated id while the element renders a consumer `id`, producing dangling `aria-*`.** The registration only flips a presence boolean and never adopts the rendered id. Affected: `fieldset/description.tsx:22-30`, `fieldset/message.tsx:49-59`, `fieldset/label.tsx:23-31`, `primitives/panel/panel.tsx:84,101`, and structurally enabled by `hooks/a11y/use-a11y-scope.ts:59-71` (which also causes the refcount bug). Fixing the scope to adopt/track the rendered id resolves all of these at once. The related class — `aria-controls`/`aria-labelledby` referencing an id that is never rendered in some configuration — also appears at `stepper-step.tsx:94-96` and `kanban-column.tsx:44-45`.

**Container keyboard handlers hijack keys from focusable descendants (no `target === currentTarget` guard, or a too-broad roving fallback).** Affected: `list/list-item.tsx:37` (Space/Arrow/Home/End), `combobox/use-combobox-input.ts:74-95` (Home/End), `tree/tree.tsx:29-33` (Arrow/Home/End via `focusOnEmpty`), `kanban/use-kanban-keyboard.ts:110-125` (can't cross empty column). All are roving-navigation handlers on a parent that fail to exclude events originating in inner controls / off-grid focus.

**Post-mount sync gaps: an effect/observer applies one prop but silently freezes the rest after mount.** Affected: `map/map-marker.tsx:49-96` (className/anchor frozen, only position synced), `signature-pad/use-signature-pad-canvas-sizing.ts:32-68` (stroke style only on resize), `credit-card-input/credit-card-input-cvv.tsx:58-68` (maxLength not re-applied), `scroll-area/use-scroll-area-scrollbar.ts:57-71` (children add/remove unobserved), `pdf-viewer/use-pdf-viewer-page-rotation.ts:24-34` (rotation not reset on doc change). Common cause: a `useCallback`/effect with deps that exclude the changing prop, or a one-time seed.

**Controlled/uncontrolled state desync — control ignores its driving prop or seeds from the wrong source.** Affected: `alert/alert.tsx:127-153` (sticky local flag overrides `open`), `filters/filters-field.tsx:118-127` (toggles never get `checked`), `switch/switch.tsx:40-87` (always React-controlled, ignores native reset), `editable-grid/use-editable-grid-numeric-editor.ts:28-44` (ignores `draft`), `tag-input.tsx:73-89` (flag leaks when parent rejects update), and the foundational `hooks/use-controllable.ts:41-53` (functional updaters collapse in a batch — affects every consumer that calls the setter with `prev => …` twice per tick).

**Layout effect / lazy state initializer reads time or measurements without an SSR/commit guard.** Affected: `color/color-eyedropper.tsx:22-27` (window.EyeDropper during render), `calendar/use-calendar-month.ts:18-22` (`new Date()` in initializer), and the caret hooks `hooks/use-pending-caret.ts:21-37` (dependency-free layout effect not tied to a specific render).

**UTC vs local-time date conversion drifts the day** — currently `query-builder/query-builder-rule-value.tsx:58-67`; the Calendar emits local-midnight Dates, so any consumer serializing via `toISOString().slice(0,10)` will hit the same ±1 day drift.

## Uncertain / needs human eyes

- **Popover trigger `aria-haspopup="dialog"` vs roleless panel** — `popover/popover-trigger.tsx:84,99`. Trigger unconditionally claims a dialog popup, but `PopoverContent` only sets `role="dialog"` when labelled (`popover-content.tsx:81`); the unlabelled generic-surface config is documented/supported. Real semantic mismatch, but `aria-controls` still resolves and whether AT actually misbehaves can't be confirmed from source.

- **FloatingSurface clobbers (vs composes) consumer on* handlers** — `primitives/floating-surface/floating-surface.tsx:46-52`. `getFloatingProps()` is called with no args, so a colliding consumer handler in `{...rest}` would be overwritten instead of chained (should be `getFloatingProps(rest)`). Mechanism verified against floating-ui 0.27.19, but no in-repo consumer passes a colliding handler — latent contract weakness, no reproducible trigger today.

- **useComposedRef never rewires when an input ref changes identity** — `hooks/use-composed-ref.ts:17-22`. Empty-dep `useCallback` means React won't re-invoke the merge callback when an input ref swaps, risking a missed wire / stale-node leak. The headline trigger (menu-trigger's `setReference`) is refuted (floating-ui memoizes it stable); no in-repo consumer passes an unstable ref, so the gap is only reachable by an external consumer.