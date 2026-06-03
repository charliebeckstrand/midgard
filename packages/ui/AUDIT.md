# `ui` Performance Audit

> Audited 2026-06-03 against Vercel's **react-best-practices** and **next-best-practices** skill rule sets.
> Surface: 104 components, 24 hooks, 19 primitives, 6 providers (~38.8k LOC). React 19 / Next 16, App Router.
> **React Compiler is not enabled**, so manual memoization is load-bearing — every `rerender-*` / `rendering-*` finding below is live, not auto-handled.

## How to read this

Findings carry a **rule ID** (from the skill rule files under `.claude/skills/`), a **severity**, and a **fix status**:

- **applied** — a low-risk, behavior-preserving change landed in this branch (see commits).
- **recommended** — correct but non-mechanical (architectural, or changes rendered output); left for deliberate review.
- **defer** — real but cold-path / marginal; documented for completeness, not worth the churn now.

## Scope of the rule sets

A component library that doesn't fetch data, route, or render on a request exercises only part of these skills. Applied: react-best-practices' `rerender-*`, `rendering-*`, `js-*`, `bundle-*`, `client-event-listeners`, `client-passive-event-listeners`, `advanced-*`; and next-best-practices' `directives`, `rsc-boundaries`, `hydration-error`, `bundling`. **Excluded as inapplicable:** all `async-*` / `server-*` / `client-swr*` waterfall and data-fetching rules, and the routing / metadata / image / font / route-handler slices of next-best-practices — the library has no surface that can violate them. This is why next-best-practices contributes almost nothing below: it's an app-layer skill, and these concerns belong in `apps/tms`.

## What's already right (counter-findings)

These were checked and came back clean — worth recording so the audit isn't read as "everything is broken":

- **`'use client'` placement is correct across the entire surface.** Zero unnecessary directives. Pure presentational components (`split`, `container`, `frame`, `glass`, `divider`, `spacer`, `aspect-ratio`, `chat-message`, `headless`, `card-description`, `grid-divider`, and the typography/nav leaves) correctly stay Server Components; React-19 Context-as-Provider usage in Server Components (`Glass`, `Headless`) is valid and used correctly.
- **Passive-listener surface is clean.** No hook registers a `wheel`/`touchstart`/`touchmove`/`scroll` listener that should be passive. `scroll-area` deliberately uses `{ passive: false }` because it `preventDefault`s shift-wheel; canvas components (`signature-pad`, `slider`, `file-upload`) wire pointer/drag via React synthetic events. The **one** exception is `map`'s wheel listener — fixed below.
- **Most context/provider values are correctly memoized:** `tabs`, `nav`, `popover`, `tooltip`, `tree`, `list`, `stepper`, `segment`, `grid`, `resizable`, and the `locale`/`link`/`skeleton`/`motion`/`density` providers. The unmemoized-value finding is a *localized* regression in a few components, not a systemic pattern.
- **Bundling is handled at the package boundary** — per-component `exports` map, no root barrel, `sideEffects: ["**/*.css"]`. Heavy deps (`maplibre-gl`, `pdfjs-dist`, `shiki`) are loaded via `import()` behind module-level dedup promises, never statically.
- **Hydration is clean outside the time/date components** — portals guard `typeof document`, IDs use `useId()`, no `Math.random()`/`Date.now()` in render. The exceptions are `time-ago` and `calendar`, below.

## Cross-cutting themes

The 139 findings reduce to seven patterns. The first four are where real user-visible cost lives:

1. **Unstable context values re-render every consumer.** `editable-grid` rebuilds its context on every render (deps are hook-return objects that are never referentially stable), re-rendering every visible cell on each keystroke; `Form`'s `useFormContext`/`useFormField` hand out fresh callbacks per render, defeating memoization on every field; `toast` viewport, `toolbar`, and `filters` carry the same defect more mildly.
2. **Closure-captured `setState` instead of the functional updater.** `accordion`, `collapse`, `tag-input`, `number-input`, and `data-table`'s column manager read current state inside a callback, forcing the callback (and any context built from it) to be recreated on every change — and risking stale values on rapid input. The `setX(prev => …)` form fixes both.
3. **Per-render `Intl` / `RegExp` construction on hot paths.** `time-ago` builds an `Intl.RelativeTimeFormat` (one of the most expensive Intl ops) on every tick; `calendar` calls `toLocaleDateString` in render and once per day cell; `currency-input` allocates three `new RegExp` per keystroke. Cache by locale/separator at module scope.
4. **Unmemoized rows/options in large lists.** The combobox/listbox `Option` isn't `memo`'d *and* shares a context that also carries `query`/`deferredQuery`, so every keystroke re-renders every option; `json-tree` virtualized rows and `kanban` cards are likewise unmemoized. Highest ceiling, but the fix is a context split — recommended, not mechanical.
5. **Unstable callback deps re-subscribe global listeners.** `use-keybindings` lists `ignore` directly in its effect deps, and `command-palette` passes an inline `ignore`, so the global tinykeys `window` listener is torn down and re-registered on *every keystroke*; `use-resize-observer` has the same shape with `callback`. Ref pattern fixes it.
6. **Time-dependent hydration mismatches.** `time-ago` seeds `useState(() => new Date())`, which renders the server clock and mismatches the client; `calendar`'s `today` has the same hazard feeding "today" highlighting.
7. **Allocation churn from inline default JSX / handlers.** Pervasive but individually cheap: fallback icons and inline arrows recreated each render across ~20 components. Mechanical hoists; batched.

## What the fix pass changed about these findings

Applying the safe subset surfaced calls the static audit couldn't make. Recorded here so the fix-status column is trustworthy:

- **False positives dropped.** `collapse`'s `toggle` and the `slider`/`panel` allocations were flagged as cheap wins but yield nothing — `collapse`'s context legitimately carries `open` (which must change per toggle), and `useControllable` already holds callbacks in a ref, so the slider/panel wrappers are no-ops. They're marked **defer** with the reasoning inline.
- **Held back as behavior changes, not "safe."** The `time-ago` hydration fix changes SSR output; the `use-resize-observer` ref refactor changes a *tested* contract; the `password-strength` dep swap drops notifications when the passed-rule set changes without the count. All three are correct but moved to **recommended** rather than landed silently.
- **Caught by tests.** The `number-input` functional updater initially broke the "first step from empty lands on 0" behavior; the fix preserves it. Every commit went through the full Lefthook gate (biome + types + 3082 tests).

---

## High severity

| Component | File:Line | Rule | Problem | Fix status |
|---|---|---|---|---|
| editable-grid | `editable-grid.tsx:113` | rerender-memo | Context `useMemo` deps are `[nav, draft]` — hook-return objects, never referentially stable, so the memo never caches and every `EditableGridCell` re-renders on each keystroke. | **recommended** (decompose deps to primitive members) |
| editable-grid | `use-editable-grid-augmented-columns.tsx:58,86` | rerender-no-inline-components | `cellProps`/`cell` column factories return new objects + inline handlers per active-cell change, busting `DataTableRow` memo for every row. | **recommended** (needs `memo(EditableGridCell)` + column-def split) |
| data-table | `use-data-table-columns.ts:57,61,63` · `data-table-column-manager.tsx:57,61,62` | rerender-memo-with-default-value | `new Set()` allocated three times per render as default/fallback, breaking referential checks. | **applied** (`EMPTY_SET` module constant) |
| form | `form/context.tsx:61,74` · `use-form-text.ts:25` · `use-form-toggle.ts:21` | rerender-memo-with-default-value | `useFormContext`/`useFormField` build fresh objects and inline `setValue`/`setTouched`/`onChange`/`onBlur` closures per render; every control in a `<Form>` re-renders on every keystroke. | **recommended** (stabilize via `useCallback`; prefer split `useFormState`/`useFormActions`) |
| time-ago | `use-time-ago-relative-time.ts:58` | hydration-error | `useState(() => new Date())` seeds the SSR clock → hydration mismatch whenever SSR and hydration straddle a unit boundary. | **recommended** (defer clock to mount effect — changes SSR output, warrants a deliberate call) |
| time-ago | `use-time-ago-relative-time.ts:85` | js-cache-function-results | `new Intl.RelativeTimeFormat(locale, …)` constructed every render/tick. | **applied** (module-level locale cache) |
| calendar | `calendar.tsx:107` | hydration-error | `useMemo(() => new Date(), [])` for `today` — misleading and hydration-unsafe; propagates to all day-cell highlighting. | **recommended** (lazy `useState` + client-only "today") |
| calendar | `calendar.tsx:165,167` | js-cache-function-results | `new Date(year,month,1).getDay()` and `toLocaleDateString(…)` recomputed in render on unrelated state changes. | **applied** (`useMemo` on `[year,month]` / `[viewDate]`) |
| command-palette | `command-palette.tsx:79` | client-event-listeners | Inline `{ ignore: () => false }` re-registers the global tinykeys `window` listener on every render, including every keystroke. | **applied** (module-level `IGNORE_NOTHING`) |
| toolbar | `toolbar.tsx:34` | rerender-dependencies | `{ orientation }` context object rebuilt every render; `ToolbarGroup`/`ToolbarSeparator` re-render unconditionally. | **applied** (`useMemo`) |
| toast | `toast-provider.tsx:131` | rerender-memo | `viewportValue` is a fresh object each render; stable callbacks churn alongside the `toasts` array. | **recommended** (split stable methods from volatile array) |
| use-keybindings | `use-keybindings.ts:60` | advanced-event-handler-refs | `ignore` in effect deps → callers with inline `ignore` re-subscribe all key listeners every render. | **applied** (ref pattern) |

## Medium severity

| Component | File:Line | Rule | Problem | Fix status |
|---|---|---|---|---|
| currency-input | `currency-input-utilities.ts:41,43,85` | js-hoist-regexp | Three `new RegExp` (locale-separator-parameterized) built per keystroke. | **applied** (module-level `Map` cache) |
| accordion | `accordion.tsx:76,78` | rerender-functional-setstate | `isOpen`/`toggle` close over `current[]`; every toggle rebuilds context → all items re-render. | **recommended** (functional set + ref-backed `isOpen`) |
| collapse | `collapse.tsx:46` | rerender-functional-setstate | `toggle` captures `open`; context rebuilt each toggle. | **defer** (false positive — the context value legitimately carries `open`, which *must* change on every toggle, so a stable `toggle` saves no consumer renders) |
| tag-input | `use-tag-input.ts:32,50` · `use-tag-input-keyboard.ts:26` | rerender-functional-setstate | `addTag`/`removeTag`/keyboard handler read `tags`, recreate per change and cascade. | **recommended** (marginal — a functional updater conflicts with `addTag`'s boolean return, and the consumers aren't memoized, so there's no render to save) |
| number-input | `number-input.tsx:72` | rerender-functional-setstate | `change(delta)` reads `current` → double-click staleness. | **applied** (`setCurrent(prev => …)`) |
| number-input | `number-input.tsx:121` | rendering-hoist-jsx | Stepper `suffix` subtree + `decrease`/`increase` rebuilt per render. | **recommended** (extract `NumberInputStepper`) |
| data-table | `data-table-column-manager.tsx:83` | rerender-functional-setstate | `toggle` rebuilds `Set` from closed-over `hidden`. | **applied** (functional updater) |
| pivot-table | `pivot-table-pivot.ts:87` | js-min-max-loop | `Math.min(...values)`/`Math.max(...values)` spread can overflow the arg limit on large buckets. | **applied** (explicit loop) |
| pdf-viewer | `use-pdf-viewer.ts` / `pdf-viewer.tsx` | rerender-memo | Context value is a fresh object each render → toolbar/viewport/thumbnails re-render. | **recommended** (`useMemo` the hook return) |
| pdf-viewer | `pdf-viewer-zoom-controls.tsx:14` · `use-pdf-viewer.ts:57` | rerender-memo-with-default-value | `zoomLevels` default array re-allocated and re-sorted each render. | **applied** (`DEFAULT_ZOOM_LEVELS` const + `useMemo` sort) |
| pdf-viewer | `pdf-viewer-thumbnails.tsx:42` | rerender-no-inline-components | `renderList` inline render-function rebuilds its subtree each render. | **recommended** (extract `ThumbnailList`) |
| map | `use-map-instance.ts:74` | client-passive-event-listeners | Wheel listener never `preventDefault`s but isn't passive → blocks scroll thread. | **applied** (`{ passive: true }`) |
| map | `map-geofence.tsx:29` · `map-route.tsx:37` | js-hoist-regexp | Global ID-sanitize regex literal recreated per render. | **applied** (module constant) |
| calendar | `calendar-day-cell.tsx:37,41` · `use-calendar-picker.tsx:121,129,145` | rerender-memo / js-cache-function-results | Per-cell `useCallback`-less handler + `toLocaleDateString` per cell; month/year/view cells rebuilt each render. | **applied** for day-cell handler (`useCallback`) + label (`useMemo`); **recommended** for picker-grid memoization |
| combobox/listbox (option) | `primitives/option/option.tsx:127,131` | rerender-memo / js-set-map-lookups | `Option` unmemoized; `selectedValue.includes` is O(n) per option; query in shared context re-renders all options per keystroke. | **recommended** (memo + `selectedSet` + context split) |
| combobox/listbox | `combobox.tsx:221` · `listbox.tsx:147` | rendering-hoist-jsx | `clearSuffix` (with inline handlers) built every render even when `clearable=false`. | **applied** (guard behind `showClear`) |
| json-tree | `json-tree-node.tsx:69` · `json-tree-node-row.tsx:46` | rerender-derived-state-no-effect / rerender-memo | Effect resets `localOpen` on search (extra render per node); virtualized row unmemoized with inline `onToggle`. | **recommended** |
| kanban | `use-kanban-keyboard.ts:33` | js-index-maps | Per-keydown O(cols×items) card lookup; drag hook already builds a `Map`. | **recommended** (share `cardIndex` Map) |
| password-strength | `use-password-strength.ts:57` | rerender-dependencies | `passedIds` array as effect dep fires on identity change. | **recommended** (swapping the dep for `passedCount` would drop `onStrengthChange` notifications when the *set* of passed rules changes but the count doesn't — a behavior change, not a safe swap) |
| credit-card-input | `credit-card-input.tsx:45` | rerender-derived-state | `formatCardNumber` invoked ~3× per keystroke. | **recommended** (unify via masked-hook return) |
| form | `use-form-reducer.ts:200` | rerender-derived-state-no-effect | Controlled-value sync via `useEffect` double-renders. | **applied** (`useLayoutEffect`) |
| slider | `slider.tsx:40` | rerender-memo-with-default-value | Inline `onValueChange` wrapper allocated per render. | **defer** (no-op — `useControllable` already holds `onValueChange` in a ref, so wrapping it changes nothing observable) |
| use-resize-observer | `use-resize-observer.ts:14` | advanced-event-handler-refs | `callback` in effect deps → observer reconnects per render for unstable callers. | **recommended** (the ref refactor is correct but changes a documented, *tested* contract — "re-subscribes when the callback identity changes"; warrants a deliberate test update) |
| use-keybindings | `use-keybindings.ts:40` | advanced-event-handler-refs | `keySignature` keyed on `bindings` identity busts the effect for inline binding objects. | **recommended** (signature from sorted key names) |
| use-dismissable | `use-dismissable.ts:62` | advanced-event-handler-refs | `escapeEnabled`/`outsidePointer` in deps re-subscribe on toggle. | **recommended** (guard inside listener via refs) |
| use-floating-ui | `use-floating-ui.ts:186` | client-event-listeners | One `document` pointerdown listener per open floating panel; not deduped. | **recommended** (shared subscriber set, as `overlay-signal.ts`) |
| use-ripple | `use-ripple.tsx:44` | rendering-hoist-jsx | Returned `element` JSX tree allocated each render. | **applied** (`useMemo`) |
| panel | `panel/panel.tsx:60` | rerender-memo | `panelAriaProps` rebuilt each render (spread, not context — limited blast radius). | **defer** (spread, not context; the provider value is already memoized, so the impact is marginal) |
| confirm | `confirm.tsx:44` | advanced-use-latest | `close` arrow recreated per render. | **applied** (`useCallback`) |
| scroll-area | `use-scroll-area-scrollbar.ts:119` | rerender-memo | `startDrag` recreated on every scroll event, churning drag-handle props. | **recommended** (ref-backed thumb sizes) |
| chat-prompt | `chat-prompt.tsx:57` | rerender-dependencies | `handleKeyDown` deps include `canSubmit`, which flips every keystroke. | **recommended** (ref the flag) |
| current | `use-current-contents-height.ts:14` | rerender-use-ref-transient-values | ResizeObserver-driven `height` state re-renders each frame during animation. | **defer** (intentional; animate value needs render) |

## Low severity

Sixty Low findings, almost all **allocation churn** — fallback JSX (`<ChevronRight/>`, `<X/>`, `<Search/>`, `<MapPin/>`, `<Phone/>`, `<Clipboard/>`, `<Upload/>`, chevrons), static spans/SVGs, and inline DOM-element handlers recreated each render in cold or shallow components. None breaks memoization today (the receiving components aren't `memo`'d). The mechanical subset was hoisted to module constants where it tidied a hot-ish leaf:

- **applied:** `spinner.tsx` static SVG hoist; the `breadcrumb-separator`, `pagination-previous/next`, and `search-input` prefix fallback icons hoisted to module constants; `filters.tsx` stray `onClear` removed from the context value/deps.
- **defer** (mechanical but allocation-only — the receiving components aren't `memo`'d, so the render benefit is zero and the diff cost isn't worth it): the combobox/listbox suffix chevron and the `sidebar`/`phone-input`/`address-input`/`copy-button`/`file-upload` single fallback icons; `checkbox`/`switch` static indicator spans; `copy-button`/`address-input` ref-in-effect → ref-in-render; `input`/`control`/`button` body-JSX `useMemo` (cold paths, carry `children`); `menu-item`/`nav-item`/`bottom-nav-item`/`breadcrumb` inline handlers on DOM elements; `progress-gauge` track `useMemo`; `radio`/`fieldset`/`switch`/`field` whole-`parent` memo deps; `use-media-query` `getSnapshot` allocation; `query-builder` `nextId` `Math.random` (client-only, safe).

The per-component Low detail lives in the slice files under `/tmp/ui-audit/` (working notes) and is summarized here rather than reproduced in full — the pattern is uniform and the fix is identical.

## Recommended follow-ups

### Done

- **Combobox/option context** — *not* the context-split + `memo()` originally proposed. On inspection `query`/`deferredQuery` were **dead context fields** (no consumer read them through the context; the render-prop receives the query as arguments), so they were simply removed. That alone stops the per-keystroke option re-render and restores the `useDeferredValue` split. Landed.

### Investigated and held — each needs an architectural decision, not a safe fix

Rigorous follow-up showed the audit's subagents over-rated these. The reasons matter:

1. **`Form` field bindings.** `useFormField` → `useFormContext` → `useFormState`, which subscribes to the **whole** state context — so every field re-renders on any keystroke *regardless* of closure stability. Stabilizing the returned closures changes nothing observable. A real fix needs per-field selector/subscription state, which conflicts with the "no global state library" rule (CONVENTIONS 6.1) and warrants an explicit architectural decision.
2. **`editable-grid` context.** The `useMemo([nav, draft])` is broken (deps are always-new objects), but decomposing it to its members is **neutral**: `commitEdit` — a context member every cell reads — lists `draft` in its deps, so the context value changes on every keystroke anyway. The effective fix is to (a) split the editing `draft` into its own context that only the active cell consumes, and/or (b) ref-stabilize `commitEdit`. Both are non-trivial changes to the most complex component's commit flow; worth doing deliberately, with the cell-render count measured before/after.
3. **`json-tree` row `memo()`.** Ineffective as-is: `flattenTree` rebuilds every `FlatNode` object on each expansion change, so a memoized row still receives a new `node` prop and never skips. Needs structural sharing (stable node identity for unchanged subtrees) in the flatten step *first*; then `memo()` pays off.
4. **`kanban` keyboard `cardIndex`.** Real but low-value — the O(cols×items) scan is per-*keydown* (low-frequency), not per-pointer-move like the drag hook's index that justifies its memoized map.

### Still genuinely worth doing (lower risk)

5. **Dedup global dismiss/escape/pointerdown listeners** in `use-dismissable`/`use-floating-ui` via the existing `overlay-signal.ts` subscriber pattern — matters when several overlays are open at once.
6. **`calendar` `today` hydration** — make "today" client-only (effect-set) so SSR and client agree. Changes SSR output, hence held from the safe-fix pass.

The highest-ceiling item is **#2 (editable-grid draft-context split)** — the only one whose payoff is a large, measurable drop in re-renders on a real hot path.
