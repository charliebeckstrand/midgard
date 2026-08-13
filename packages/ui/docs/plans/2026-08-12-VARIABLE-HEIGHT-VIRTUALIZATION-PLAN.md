# Variable-Height Virtualization — Design Plan — 2026-08-12

What a measured mode in `useVirtualWindow` costs, which three consumers it unblocks, and the two decisions that must be taken before any of it is written. The hook change is small. What a window does to a mount policy, to a scroll pin, and to a `log` region is the reason this needs a written record.

## Thesis

One wrapper limit stands under three separate items in three separate trackers. [`use-virtual-window.ts`](../../src/hooks/use-virtual-window.ts) passes `@tanstack/react-virtual` no `measureElement` and no `getItemKey`, so every row must measure the one `estimateSize` number the caller gives. A row that does not misplaces the window below it.

The library measures dynamic rows; only this wrapper withholds it. So the work is extension rather than invention ([`CLAUDE.md`](../../../../CLAUDE.md) §1.1), and the uniform path must keep costing exactly what it costs today.

The three items it unblocks are not equal. The chat transcript is the one a number put on the list. The grid's grouped and master-detail bodies are the one with the widest blast radius. A third — a JSON tree of wrapped values — is not asked for and stays out.

## Current state (verified in tree, 2026-08-12)

`useVirtualWindow` is 95 lines over react-virtual 3.13.26. It takes `count`, `getScrollElement`, `estimateSize` as a single number, and `overscan`; it returns `virtualItems`, the two spacer heights, and `scrollToIndex`. It also holds a re-sync guard — a passive effect that forces one re-render when the virtualizer's captured scroll element diverges from the live one — which any change here must keep.

Two consumers read it. [`grid-virtualized-body.tsx`](../../src/modules/grid/grid-virtualized-body.tsx) renders `<tr>` spacers inside a `TableBody`, drives infinite scroll off the last window item's index, publishes `scrollToIndex` to the cursor, and re-fits the columns from a layout effect once a window lands. [`json-tree-virtualized.tsx`](../../src/components/json-tree/json-tree-virtualized.tsx) renders `<div>` spacers and picks its roving Tab stop out of the window.

The grid stands windowing down rather than working around the limit. `resolveGroupingGates` ([`engine/grid-group/resolve.ts:142`](../../src/modules/grid/engine/grid-group/resolve.ts)) computes `ownBody` from `groupingActive`, `manualGroupingActive`, and `expandableActive`, and any one of the three sets both `virtualize` and `navigable` to `false`. So client grouping, manual grouping, and master-detail each lose the window **and** the keyboard cursor, on every row count.

The chat transcript renders every message. [`chat-transcript.tsx`](../../src/modules/chat/chat-transcript.tsx) maps the whole list to `ChatMessage` and pins to the bottom through [`use-chat-scroll.ts`](../../src/modules/chat/use-chat-scroll.ts), which writes `element.scrollTop = element.scrollHeight` in a layout effect at mount and smooth-scrolls on each `messages` identity change. The region carries `role="log"` with `aria-live="off"`.

A chat row's height varies by three routes, and only one of them is a function of the message data. A bubble wraps to its content, which the data decides. A `tool` step is a `Collapse mount="lazy"` the reader opens at will ([`chat-tool.tsx:79`](../../src/modules/chat/chat-tool.tsx)). And a deferred embed swaps a reserved height for its drawn one the first time it is reached: [`chat-embed.tsx`](../../src/modules/chat/chat-embed.tsx) reserves `part.height ?? 160` while held back, over `useInView` and `useMountHold`.

The chat benches exist and already carry the bar. [`chat-render.bench.tsx`](../../src/__benchmarks__/chat-render.bench.tsx) runs a 50-, 500-, and 5,000-message fixture for mount and for a streamed chunk. The chat roadmap's numbers, read rather than re-run here, are a chunk at 0.88 / 3.4 / 41 ms against a 16 ms frame, and a mount at 38 / 224 / 1,921 ms.

## The rule

**A measured row is opt-in, and a uniform caller pays nothing.** `estimateSize` widens to `number | ((index: number) => number)` and stays the first guess. Measurement turns on only when the caller asks for it and attaches the returned `measureRef` to each row element. The two existing consumers keep their exact call shape and their exact cost.

**A measured window needs a stable key per row, and the caller owns it.** Without `getItemKey`, react-virtual caches a measured height against the row's index. A transcript that prepends history, or branches, then reads a stale height for every row after the insertion point. The chat has the key already — increment 3 of the chat roadmap put an id on every message and every part for exactly this class of reason — so the wrapper takes `getItemKey` and refuses to guess.

**Do not measure what does not vary.** The grid's flat body, the JSON tree, and any list of one-line rows keep the uniform path. A measured window costs a `ResizeObserver` per rendered row plus a re-layout per measurement; paying that for rows that all match `estimateSize` is a straight loss.

## Decide before building

Two questions have no obvious answer, and each changes what gets written. Neither is a preference.

### 1. What `mount` means under a window

`always`, `lazy`, and `active` are implemented by [`useMountHold`](../../src/primitives/mount/mount.ts), which keeps a held subtree in the tree under `Activity`. A row-wise window works the other way: a row outside the window is not rendered at all.

The failure is concrete rather than theoretical. `useMountHold` remembers a lazy panel in `everActive`, a `useRef`, and `useInView` latches `inView` in the row's own state with `once: true`. Both die with the row. So a chart that `lazy` promised to keep flickers back through its deferred placeholder every time the reader scrolls past it and returns, and `always` cannot be honoured at all.

Holding the rows the way `Mount` does is not the answer, and the bench says why. An `Activity`-hidden subtree still renders, so 5,000 held rows still rebuild 5,000 elements — which is the 41 ms this whole plan exists to remove.

**The recommendation is to move the memory above the window and narrow the contract in the doc.** A set of part ids that have been reached, owned by `ChatEmbedProvider` rather than by the row, survives the row's unmount, so a returning embed draws immediately instead of re-deferring. What it cannot restore is the renderer's own internal state, so under a window `lazy` means "no second deferral", not "held". `always` must be documented as unreachable under a window, and the transcript should say so rather than accept a policy it silently downgrades.

This is the call worth pressure-testing before it is written; it is a `/council` question under [`CLAUDE.md`](../../../../CLAUDE.md) §3.2, not a `/debate` one, because the competing costs are not two sides of one axis.

### 2. Whether the pin survives measurement

`useChatScroll` writes raw `scrollTop`. Under a measured window the container's `scrollHeight` at mount is `count × estimate` rather than the real total, and it changes as rows measure, so a pin written against it drifts while the reader watches.

The fix is to stop writing `scrollTop` and to pin through the virtualizer, which already knows the total: `scrollToIndex(count - 1, { align: 'end' })`, the value the wrapper already returns. That reaches into `useChatScroll`'s contract, and the hook is public, so this is an API change rather than an internal swap. Decide whether `useChatScroll` grows a windowed arm or the transcript stops using it for the pin.

## Increments

Each lands on its own and leaves the package whole.

1. **The measured mode, with no consumer.** `estimateSize` widens, `getItemKey` and a `measureRef` join the returned shape, and the uniform path stays the default. The re-sync guard and the spacer math both have to hold with measured sizes, because `bottomSpacer` is derived from `getTotalSize()`, which now moves per measurement. Proof: a new suite over both modes, plus the grid and JSON-tree suites green and unedited.

2. **The transcript adopts it.** Keys come from the message id, the pin moves off raw `scrollTop` per decision 2, and the embed latch moves above the window per decision 1. The `role="log"` region then holds a slice rather than the whole transcript; the announcer is unaffected, because it speaks a string through `useA11yAnnouncements` rather than reading the DOM, but the region's contents change and the a11y corpus must state what a reader now finds. Proof: `chat-render.bench.tsx` holds the 500-message chunk cost, about 3.4 ms, out to 5,000 — the bar the chat roadmap set. The benches are the acceptance test, not a follow-up.

3. **The grid's self-rendering bodies.** This one starts with a probe, not a patch: `measureElement` on a `<tr>` in a fixed-layout table with spacer rows is unverified in this tree, and the whole increment rests on it. If it holds, `resolveGroupingGates` can stop standing `virtualize` down for grouping and master-detail. One blocker outlives the probe — the group collapse animation needs its leaves mounted across the `1fr`↔`0fr` transition, which a window unmounts — so this increment either says how that is kept or does not ship. Note that lifting `virtualize` does not lift `navigable`: the same gate kills the cursor, and re-arming it is its own change.

## Ruled out

**Cap the transcript.** Rendering the last N messages behind a "load older" control costs nothing structural and removes the number entirely. It is rejected as the primary answer because it changes the product — history stops being reachable by scroll — but it is the honest fallback if increment 2's measurement proves unstable, and it is cheaper than a half-working window.

**`content-visibility: auto`.** The CSS route skips layout and paint for off-screen subtrees, and it cannot touch this number: the 41 ms is React rebuilding 5,000 elements, which the browser's rendering work is downstream of. Worse, the bench could not see the difference either way — `chat-render.bench.tsx` runs in jsdom, which has no layout at all — so adopting it would be a change with no measurement behind it, which is the thing the chat roadmap's own principle forbids.

**Memoize harder.** Increment 7 of the chat roadmap already measured the memo as eliding about 98% of the per-message work. What remains is the `.map` that rebuilds the elements and React's bail-out check on each, and neither is reachable by memoizing more.

## Proof

Increment 1 is proven by suites, increment 2 by benches, and increment 3 by a probe before anything else. A conversion that edits an existing grid or JSON-tree test has changed the uniform path, which the rule forbids — those suites passing unedited is the bar for the hook change, exactly as it was for the effect-event sweep.

---

**See also:** [`HOOKS.md`](../HOOKS.md) · [`../../src/modules/chat/ROADMAP.md`](../../src/modules/chat/ROADMAP.md) (the entry a number put at the head of the backlog) · [`../../src/modules/grid/ROADMAP.md`](../../src/modules/grid/ROADMAP.md) (which retired this from its tracker) · [`CONVENTIONS.md` §12](../../../../CONVENTIONS.md).
