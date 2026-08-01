# React `<Activity>` Adoption Audit

Survey of `packages/ui` (2026-08-01) for surfaces where React 19.2's `<Activity>` would retire hand-rolled hide-or-unmount machinery, followed by a verification pass and the adoption it justified. Method: a sweep of every conditional-render site, every `aria-hidden`/`inert` pair, and every module-level cache whose stated reason is a remount; then a probe per claim, since several rested on assumption. Three findings did not survive that pass and are recorded below as corrections. Line numbers are as of this commit and will drift.

A naming note, since the request that prompted this named it `<Visibility>`: React 19.2 exports `Activity`, not `Visibility` — verified against the installed runtime (`react@19.2.7`) and `@types/react@19.2.15` (`ActivityProps`, `mode?: 'hidden' | 'visible'`). `Visibility` was a candidate name during the `Offscreen` → `Activity` rename and never shipped.

## What a hidden Activity actually does

Stated precisely, because the first draft of this audit was loose about it and the grid finding turned on the difference. `mode="hidden"` keeps children in the DOM at `display: none`, preserves their DOM and React state, and tears down their effects (cleanup on hide, setup on show) — all pinned by [`__tests__/primitives/mount.test.tsx`](../../src/__tests__/primitives/mount.test.tsx).

It does **not** stop hidden children from rendering. Measured directly: under a `flushSync` parent update the visible child committed at the new value while the hidden child's component had not re-run and its DOM still read the old one; both caught up once the deferred work flushed. So Activity moves a hidden subtree's render **off the synchronous commit**, at a lower priority — it does not delete the work. Every claim below is a latency claim, never a total-work one.

Two consequences shape all of it. `display: none` cannot animate, so any hold on an animating panel has to wait for the transition to land rather than replacing it. And a hidden Activity still renders its children once, so `always` is only safe over bounded content — recursive trees take `lazy` or nothing.

## Landed

- [x] **Shared mount hold** — [`primitives/mount`](../../src/primitives/mount). `useMountHold(active, mount, defer)` resolves a `Mount` policy (`always`/`lazy`/`active`) into presence, hold, and hidden state; `Hold` applies it. Extracted from `CurrentContent`, which had the only copy: presence, the lazy latch, the rest latch, and the Activity wrap were all entangled with its fade choreography, and Collapse, Accordion, and Stepper each needed the same lifecycle. `CurrentContent` now composes it and keeps `useExitHold`, which is genuinely fade-specific. Behaviour-neutral there — its 63 existing tests were the guard.

- [x] **`components/stepper`** — `StepperPanel` was `if (value !== currentValue) return null`, so stepping back through a wizard rebuilt the panel empty; a probe confirmed uncontrolled input state was lost. `Stepper` now takes `mount`, defaulting to today's `active`. `lazy` holds each panel from its first visit, preserving DOM state and scroll position. `StepperStep`'s `aria-controls` rule widened with it (`stepper-step.tsx:31-42`): the reference resolves for the current step always and for every step under `always`, and stays off under `lazy`, where no step can observe which panels have been visited.

- [x] **`components/collapse`, `components/accordion`** — both unmounted the closed panel with no opt-out, losing its state; both now take `mount`. A held panel stays mounted and animates between its open and closed states in place rather than entering and exiting, dropping into the hold once the closing height transition lands. Accordion's policy sits on the root, since its items share one open set.

- [x] **`modules/grid`** — collapsed group leaves, detail rows, and total rows now rest in a hidden Activity once their `1fr`↔`0fr` reveal lands ([`use-grid-reveal-hold.ts`](../../src/modules/grid/use-grid-reveal-hold.ts)). A grouped body stands virtualization down (`grid-body.tsx:357-384`), so every leaf of every group is mounted and re-rendered whatever its group's expansion. Measured on [`grid-collapsed-rows.bench.tsx`](../../src/__benchmarks__/browser/grid-collapsed-rows.bench.tsx) — 500 rows, 19 of 20 groups collapsed, Chromium, mean per body update:

  | | mean |
  |---|---|
  | collapsed rows live (before) | 10.16ms |
  | collapsed rows rested (after) | 0.38ms |
  | all expanded (ceiling) | 10.70ms |

  A 26× cut in visible-commit latency. The third bar is the finding in one number: `all expanded` and `collapsed rows live` are within noise of each other, so collapsing a group bought nothing before this. The landing arrives as a `transitionend` bubbling from the cells that animate; under `prefers-reduced-motion` the recipe drops the transition, so the row rests on the toggle itself.

- [x] **`components/pdf-viewer`** — the desktop sidebar's thumbnail rail kept rendering behind the closed panel; its contents now rest once the slide lands (`pdf-viewer-thumbnails.tsx:40-44,86-92`).

## Corrections

Three findings from the first pass were wrong. Recorded rather than deleted, so the same reasoning isn't repeated.

**`aria-hidden`/`inert` are not redundant with a hold.** The first pass read the grid rows' and PDF sidebar's `aria-hidden` + `inert` as machinery Activity would replace, and graded both partly on that deletion. It won't: those attributes take effect on the toggle, while the hold must wait out the collapse transition, so removing them would leave the closing surface reachable for its whole animation. They are complementary — the attributes cover the collapse's semantics from its first frame, the hold covers its cost from the last one. Both changes landed as pure latency work; no attribute was removed.

**The docs `Example` workarounds are not workarounds.** `example.tsx:87-99` carries a `derivedRef` cache and a `hasDerivedCode` latch, which the first pass attributed to `Collapse` unmounting and expected a mount policy to delete. Neither goes: `derivedRef` exists so the derived source survives `open` flipping false, and a held panel needs that just as much as an unmounted one — the walk is gated on visibility, not on mounting, and re-walking every held panel on each control tweak would cost more than it saved. `hasDerivedCode` decides whether the trigger renders at all and never depended on the policy. `mount="lazy"` would buy only the shiki tokens surviving a reopen, which the module LRU at `code-block.tsx:9-23` already serves. Not adopted.

**Tabs' mounted-panel bookkeeping did not need hoisting.** The first pass expected Collapse, Accordion, and Stepper to each need Tabs' ref-count (`tabs.tsx:60-79`) to know whether a panel is in the DOM, and called for hoisting it ahead of them. None of them needed it. Tabs counts because it admits several `TabContents` registrants with independent policies; Stepper has one panel group with one known policy, so a two-clause rule over `mount` and step state answers the same question with no bookkeeping at all, and Collapse and Accordion resolve their own panel's presence locally. The counter stays where it is, earning its keep only where the ambiguity is real.

## Open

- [ ] **`src/components/json-tree/json-tree-node.tsx:160-171`** (with `:90`, and `tree/tree-item-children.tsx:49-63`) — verified: collapsing a branch and reopening it resets every descendant's expansion in uncontrolled mode, because the subtree unmounts and each node's local `userOpen` goes with it. The controlled path over a path set survives, which makes the uncontrolled behaviour read as a defect. Left open deliberately: the fix is `lazy`-shaped (hold what has been opened, never pre-mount what has not), and both components interact with virtualization (`json-tree-virtualized.tsx`) in ways the landed work does not, so it wants its own change and its own measurement. **Fix:** hold opened subtrees under a `lazy` policy only; `always` would mount a whole document up front.

- [ ] **`src/components/tabs/tab.tsx:137-146`** (with `:41,88`) — the latched `onPreload` warms an inactive tab's panel on hover or focus. Under `lazy`/`always` a hidden Activity pre-renders the held panel, which warms render-phase work for free (a `lazy()` chunk, a `use()`d promise) but not effect-driven work, since hidden Activity mounts no effects — a React Query `useQuery` in a held panel still waits to be shown. The hook is right; nothing documents which half the mount policy already covers. **Fix:** note the split in `onPreload`'s TSDoc and in the `mount` remarks on `tab-contents.tsx:23-32`.

- [ ] **`src/components/code/code-block.tsx:9-23,80-113`** and **`src/modules/map/map-geometry-cache.ts:9,124`** — both module-level caches name a remount as their reason, the map one citing a tab switch explicitly. A hold removes that remount but not the cross-instance sharing both also serve, so neither cache goes away; only its hit rate shifts. Recorded so the next reader doesn't mistake them for candidates. **Fix:** none; revisit only if a hit-rate measurement shows the remount case dominating.

## Ruled out

Floating surfaces — Tooltip, Popover, Menu, Select, Combobox, Listbox — all mount through `primitives/portal/presence-portal.tsx:47-67` and should keep unmounting. Measured, not assumed: `__benchmarks__/browser/tooltip-lifecycle.bench.tsx:17-23` puts the whole surface subtree at ~1.15ms to rebuild, reclaimable only on a full cycle the exit fade does not already absorb, against a resident portal node per surface. Their options derive from props, so there is no state a hold would preserve.

Dialog, Drawer, and Sheet run the same lifecycle through `primitives/overlay/overlay.tsx`, with scroll lock, focus trap, and floating-ui's `markOthers` all keyed to `open`; a resident modal would need every one of them gated by hand — more custom code, not less.

The chart legend's `inert` (`modules/chart/engine/chart-legend/legend.tsx:839`) marks a *visible* non-interactive legend, not a hidden one, and the measuring ghost at `:873-894` must lay out to be measured. `recipes/kata/toggle-icon-button.ts:11` cross-fades two stateless icon leaves. `components/sidebar/sidebar.tsx:62` mini mode is a CSS collapse that never unmounts. None have state or effects to preserve.

`modules/chart/engine/chart-context-menu.tsx:64-68` mounts a genuinely second copy of the chart in the fullscreen dialog, re-measured at the dialog's size. Activity preserves a subtree where it stands; it cannot relocate one, so the re-mount is inherent.

---

**See also:** [`PRIMITIVES.md`](../PRIMITIVES.md) · [`2026-07-13-DOCS-PERF-AUDIT.md`](2026-07-13-DOCS-PERF-AUDIT.md) · [`CONVENTIONS.md`](../../../../CONVENTIONS.md).
