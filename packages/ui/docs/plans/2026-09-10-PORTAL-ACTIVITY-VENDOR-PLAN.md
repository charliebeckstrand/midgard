# Portal identity under `<Activity>` — why the patch, and what vendoring would cost

> **Status.** `patches/@floating-ui__react@0.27.19.patch` is landed and covers this. The patch
> is a stopgap by intent. This document exists so the vendoring question can be picked up cold:
> it records the mechanism, the four shapes that were tried and measured, and what taking the
> portal into `packages/ui` would actually involve.
>
> **Read the constraint first (§4).** It is the whole reason a dependency patch was chosen over
> our own code, and it is not a matter of taste.

## 1. What breaks

An overlay open inside a subtree that React parks in `<Activity mode="hidden">` comes back
**rebuilt**. The surface's `useState` returns to its initial value, its DOM is new, and its
scroll offsets are gone. Nothing above the portal remounts, which is what made this read as a
routing or a presence bug for as long as it did.

The mechanism is in `useFloatingPortalNode` (`@floating-ui/react@0.27.19`):

```js
useModernLayoutEffect(() => {
  return () => {
    portalNode?.remove()
    // Allow the subsequent layout effects to create a new node on updates.
    queueMicrotask(() => { portalNodeRef.current = null })   // ← the load-bearing line
  }
}, [portalNode])
```

The node is built inside a layout effect and removed in that effect's cleanup, and the ref is
cleared a microtask later precisely so the next run builds a **new** node. That is deliberate —
it is how a changed `root` moves the surface (floating-ui#2454) — and it is correct for a mount
and an unmount.

`<Activity>` is neither. It runs a hidden subtree's effect cleanups to hide it and re-runs the
effects to reveal it. So parking deletes the node and revealing builds a replacement; and because
`createPortal` counts its container as part of the portal's identity, React unmounts everything
the portal held and mounts it again inside the new container.

Two places park a subtree this way, and both are ours:

- Next's App Router parks the last N navigated-away route trees in `<Activity mode="hidden">`
  (`layout-router`, capped at 3 by `MAX_BF_CACHE_ENTRIES`). In tms-ui that is what an in-app tab
  switch does, so every overlay open in a tab you switch away from was rebuilt on the way back.
  The reported symptom was the AP Review Invoice drawer returning to its Fields pane.
- `primitives/mount`'s `Hold` parks an inactive Tabs/Nav panel in the same boundary, for the
  `lazy` and `active` mount policies. Same defect, no router required.

Everything reached through `primitives/overlay` (Dialog, Sheet, Drawer) and
`primitives/floating-surface` (Tooltip, Popover, Menu) goes through `PresencePortal` and is
therefore affected. `components/listbox/listbox-panel.tsx` and
`components/combobox/combobox-panel.tsx` reach `FloatingPortal` directly and are affected on the
same terms.

## 2. Ruled out — do not re-run these

Recorded so the next person does not repeat the search.

**It is not `instant = false`, and it is not Cache Components adoption.** `MAX_BF_CACHE_ENTRIES`
is `process.env.__NEXT_CACHE_COMPONENTS ? 3 : 1` — a build-time constant — and the `<Activity>`
wrap is gated on the same flag, so `cacheComponents: true` alone puts the bfcache in play. The
`instant` segment config is read in exactly two places, both in
`server/app-render/instant-validation/instant-config.js`: `isPageAllowedToBlock` and
`anySegmentNeedsInstantValidation`. Prerendered shell and build/dev validation; nothing
client-side. Verified in a browser: with the opt-outs left in place, a page's `useState` survives
a tab round trip intact.

**It is not the href.** `createRouterCacheKey(segment, /* withoutSearchParameters */ true)`
reduces `__PAGE__?view=139` to bare `__PAGE__` for the *state* key, so search-param writes —
including the `history.replaceState` a grid does on every sort, filter and debounced search —
cannot move a parked entry.

**It is not a route-group crossing**, and the cap of 3 is not being exceeded; one tab away is one
entry.

**Related but distinct, and still live:** `usePathname()` and `useSearchParams()` inside a parked
tree report the **active** tab's URL, not the parked tree's own. Measured directly: a probe in the
parked escalation tree read `path=/ q=-` while its own tab's href was
`/ap/workspace/escalation?view=139`. Today `AnimatePresence` masks the consequence for the drawer
(it retains the exiting child, and the exit never completes while the subtree's effects are down),
but anything that gates a *mount* on the URL without a presence wrapper between will tear itself
down while parked. That is a separate problem with a separate fix and is not addressed here.

## 3. What the patch does

Three hunks, applied to `dist/floating-ui.react.mjs`, `.esm.js` and `.umd.js`. The UMD build is
included because a CommonJS `require.resolve('@floating-ui/react')` lands on it; the minified UMD
build is left alone, as nothing in either repo can reach it.

1. **The cleanup keeps the ref.** The node is still removed from the document, so a closed
   surface strands nothing, but `portalNodeRef.current` survives — so the effects below re-attach
   it rather than build a replacement.
2. **Both creation effects re-attach when a node already exists.** They previously bailed out on
   `if (portalNodeRef.current) return`, which with a retained ref would have left the node
   detached forever.
3. **Re-attachment targets the freshly resolved container** (recreating the `id` wrapper if it is
   gone). That is what preserves the behaviour rebuilding used to provide: a changed `root` or
   `id` still moves the surface.

Detaching on hide is kept on purpose. **Detached is not unmounted:** while the node sits out of
the document its children hold both their React state and their DOM, so the reveal restores the
surface rather than replaying its mount.

Coverage: `src/__tests__/browser/floating-ui/overlay-activity-hold.test.tsx`. It has to live in
the `floating-ui` browser project — both jsdom projects mock `@floating-ui/react`, and the mock
renders `FloatingPortal` inline, so the node lifecycle under test does not exist there. The test
was verified to **fail** with the patch's ref-nulling restored and pass with it removed. Note that
Vite's dep cache will happily serve the pre-patch module and make that check look green; clear
`packages/ui/node_modules/.vite` when toggling the patch.

## 4. Why a patch and not our own portal

**The surface has to stay a React *descendant* of `FloatingPortal`.** That position is what
gives `FloatingFocusManager` its portal context, and the context is what makes Tab work across
the portal boundary. Any shape that stabilises the container has to take the children out of
floating-ui's node — and the container *is* floating-ui's node.

Four shapes were built and measured against a baseline of jsdom 6612/6612 and a browser suite
that is green per-file but swings 0–2 order-sensitive failures in a full run (see the caveat in
§5.3 — every real regression below reproduced in isolation, every flake did not):

| Shape | Result |
|---|---|
| `host` node inside `FloatingPortal`, `display: contents` | Wedged the renderer with the drawer open |
| Same, without `display: contents` | Did not fix it — the inner portal is a child of the outer one, so the outer rebuild unmounts it regardless |
| `createPortal` into a stable `host` as `FloatingPortal`'s **sibling**, host carried into floating-ui's node by a ref, with an `adopted` latch | Fixed the state loss; 2 jsdom focus failures (the latch delays the surface by a commit) |
| Same, latch removed | Fixed the state loss, jsdom green — **4 real-browser focus regressions** |

Those four, reproducible in isolation on the change and green in isolation on baseline:

- `grid-filter-sheet` — "keeps the sheet open when picking from the nested operator select"
- `grid-filter-sheet` — "closes the operator listbox on a press elsewhere in the sheet"
- `persistent-chrome` — "lets Tab leave the panel for the region and come back"
- `tooltip-trap` — "cycles Tab across the trigger and the panel controls"

The first two are nesting: a nested `FloatingPortal` resolves its container from
`root || portalContext?.portalNode`, and moving the surface out of the React subtree leaves it
with neither, so the nested listbox lands in `document.body` where the sheet's dismissal logic
reads it as an outside press. Our own `PortalContext` could plausibly recover this pair — the
listbox and combobox panels already read `usePortalContainer()` and pass it as `root`, and `root`
wins — but that was not tried, because it does nothing for the other two.

The other two are the `preserveTabOrder` guards, and they are structural. Two of the four are
Tab order across a portal boundary, which is WCAG 2.1.2 / 2.4.3 ground the `chrome` primitive
exists to protect, so shipping without them was not on the table.

## 5. What vendoring would look like

### 5.1 The coupling is bidirectional

`FloatingPortal` publishes a context whose value is:

```ts
{ preserveTabOrder, beforeOutsideRef, afterOutsideRef, beforeInsideRef, afterInsideRef,
  portalNode, setFocusManagerState }
```

`FloatingFocusManager` consumes all of it:

- `portalNode` — to decide whether focus moved to an unrelated node, to build its `insideElements`
  set for `markOthers`, and to discover nested portals by querying `[data-floating-ui-portal]`
  inside it
- `beforeInsideRef` / `afterInsideRef` — merged with its own guard refs
- `beforeOutsideRef` / `afterOutsideRef` — the Tab redirection targets when `preserveTabOrder`
- `preserveTabOrder` — gates that redirection
- `setFocusManagerState` — **calls back into the portal** so the portal knows to render its
  guards (`shouldRenderGuards`)
- the mere presence of the context — `isInsidePortal`, and
  `shouldHandleBlurCapture = Boolean(!tree && portalContext)`

Neither `PortalContext` nor `FocusGuard` is exported. **A vendored context object is a different
context**, so a vendored `FloatingPortal` alone would publish into a context
`FloatingFocusManager` never reads, and `setFocusManagerState` would never be called — which is
exactly the two guard regressions in §4, arrived at by a longer road.

### 5.2 Three scopes

**Scope A — vendor the portal only.** ~190 lines (`useFloatingPortalNode` ~63, `FocusGuard` ~26,
`FloatingPortal` ~100). Does **not** work, for the reason above. Recorded only so it is not
attempted.

**Scope B — vendor the portal *and* the focus manager.** Adds `FloatingFocusManager` (~408 lines)
plus its transitive helpers: `markOthers` / the modified `aria-hidden` counter machinery (~120
lines with the WeakMap counters), `getTabbableContent`, `enableFocusInside` /
`disableFocusInside`, `isOutsideEvent`, `getPreviousTabbable` / `getNextTabbable`, the
`FloatingTree` interaction, and the untrapped-typeable-combobox special cases. Realistically
600–800 lines of a11y-critical code with no upstream tests coming along, and it puts us on the
hook for the Safari VoiceOver guard-role workaround, the `inert` vs `aria-hidden` fallback, and
every focus edge case the library has accumulated. `useFloating` and the middleware stay upstream.

This is the only scope that actually closes the problem in our own code.

**Scope C — vendor nothing; fix the composition instead.** Not a vendor, but it belongs on the
list. Two variants, both rejected:

- *Hoist overlays above the parked boundary* — render the surface from a registry mounted above
  the route split, the way `NewChatDrawer` already sits above `(shell)`/`(bare)` in tms-ui. The
  effects then never tear down. It fails because the surface would render outside its route's
  React context: the AP drawer's `ReviewSurfaceProviders` and staged corrections live inside the
  route, and reaching them from above the split is a larger change than the bug.
- *Keep the state above the portal* — what `ReviewSurfaceProviders` already does for corrections.
  Per-surface, and it recovers no scroll offsets, no open menus, nothing the DOM held. Explicitly
  ruled out as a per-value workaround.

### 5.3 If Scope B is taken

Suggested shape, following the library's own layering:

```
primitives/portal/
  portal.tsx              (unchanged — PortalContainer context)
  presence-portal.tsx     → renders the vendored portal instead of FloatingPortal
  floating-portal.tsx     (new) FloatingPortal + FocusGuard + the portal context
  focus-manager.tsx       (new) FloatingFocusManager
  focus-utilities.ts      (new) markOthers, tabbable helpers, focus-inside toggles
```

Then migrate every direct consumer off `@floating-ui/react`'s portal and focus manager in one
change — `primitives/overlay/overlay.tsx`, `components/listbox/listbox-panel.tsx`,
`components/combobox/combobox-panel.tsx` — because a tree with both portals in play has two
contexts and nests across neither. Keep MIT attribution at the top of each vendored file, and
keep the upstream shape rather than tidying it, so a later upstream fix can be diffed in.

**Gates before it can be believed.** The whole reason the patch is cheap is that it moves none of
these:

- `LANG=en-US vitest run` — the jsdom suite, expected 6612/6612. Watch for tests scoped to the
  render container: the jsdom mock renders `FloatingPortal` inline, so anything that changes
  where the surface lands shows up here as ~99 failures across ~30 files, all of them
  `bySlot(container, …)` and `within(container)`. That count is a signal that the surface moved,
  not that 99 things broke.
- `LANG=en-US vitest run --config vitest.browser.config.ts` — the real engine, 528 tests with
  the new one. Do not expect a clean 528: a full run lands 0–2 order-sensitive failures either
  way (the clean baseline itself measured 525/527 in one full run and green in the next).
  `grid-filter-sheet`, `persistent-chrome`, `tooltip-trap`, `trap-corpus`, `listbox-focus`,
  `menu-trigger-focus`, `calendar-picker-trap` and `date-picker-input-tab` are the ones that
  matter; they are the ones that caught every wrong shape in §4. **Run the failures in isolation
  before believing them** — this suite is order-sensitive and swings 1–6 failures on a clean
  baseline, and every real regression so far reproduced in isolation while every flake did not.
- `overlay-activity-hold.test.tsx` must still fail without whatever the fix is. A vendored portal
  that quietly kept the rebuild would leave the test green only because the test asserts state
  survival, not node identity.
- The tms-ui side: the AP Review Invoice drawer on Charge lines, open a carrier in a new in-app
  tab, switch back. jsdom cannot assert this, and a green suite is not evidence.

## 6. Upstream

The better long-run answer, and the reason the patch comments point at floating-ui#2454. An
upstream fix is small and does not need our vendoring: re-attach the retained node rather than
clearing the ref, which keeps #2454's intent (a changed `root` still moves the surface) while
making the hook `<Activity>`-safe. Worth filing with the `overlay-activity-hold` test as the
reproduction — React 19's `<Activity>` shipping means every portal library will meet this.

## 7. Exit criteria

Drop `patches/@floating-ui__react@0.27.19.patch` and its `pnpm-workspace.yaml` entry when either
an upstream release makes the hook Activity-safe, or Scope B lands. In both cases
`overlay-activity-hold.test.tsx` is the thing that says whether it is safe to drop; keep it
either way. `pnpm` fails loudly if the patch ever stops applying against a bumped
`@floating-ui/react`, which is the intended tripwire rather than an inconvenience.

Both repos carry the patch, byte-identical (`patch_hash=7bd33aaf…`). Keep them in step.

---

**See also:** [`PRIMITIVES.md`](../PRIMITIVES.md) · `primitives/portal/presence-portal.tsx` ·
`primitives/mount/hold.tsx`
