# Layout-Aware Pie/Donut Callout Labels — 2026-07-04

Replace the estimate-driven SVG callout labels with measured **Panel-surface cards** positioned through floating-ui: each card wears the tooltip/popover chrome (translucent fill + backdrop blur + ring), sits **flush to the container edge** with its cross-axis centered on the sector it names — **no leader line** — and the pie shrinks only as much as the measured cards demand. Labels render by default: callouts where they fit, sector labels where they don't. Untracked scratch doc — commit, move, or delete as you see fit.

## Current state (verified 2026-07-04)

- `chart-pie.tsx` reserves callout room by character estimate: `calloutRoom` (`chart-pie.tsx:275`) returns `CALLOUT_LEADER + CALLOUT_NUB + CALLOUT_GAP + chars × TICK_CHAR_WIDTH`, applied as a **symmetric** `hMargin` (`chart-pie.tsx:516-518`). This is the arbitrary padding being removed: no measurement, no wrapping, both sides pay for the widest label anywhere.
- `pieCallouts` (`pie-chart-geometry.ts:378`) places SVG `<text>` at `radius + 14` with a leader polyline and a constant-height declump (`CALLOUT_LINE = 15`). Leaders and the whole SVG-text path are being retired.
- Labels are opt-in via `labels?: { segment?, callouts? }` (`chart-pie.tsx:33`), both default false. No `apps/` consumers; only docs demos and `pie-chart.test.tsx`.
- Panel/Tooltip/Popover surface = the `omote.popover` chrome `[blur.md, bg.popover, ring.default]` (`recipes/kiso/omote/popover.ts`), or `omote.glass` `[bg-transparent, blur.md] + ring` under a `<GlassProvider>`. `TooltipContent` applies it via `kata/tooltip` (`k.content({size})` + `k.surface[glass ? 'glass' : 'default']` + `k.motion`), reading `useGlass()`. `ChartTooltip` already reuses this exact chrome and maps frame→client coords through the plot rect to drive floating-ui.
- The frame: `usePlotFrame` observes container width (ResizeObserver, transition priority); pie default sizing is `content` mode — `height = 2·(W/2 − hMargin) + 2·vMargin`, reserved via padding-box CSS (`chart-plot-box.tsx`). Explicit `height`/`aspectRatio` win.
- Animation: mask-stroke sweep (`SLICE_SWEEP` 0.8s), labels fade at `sweepDelay(mid)`; all motion inside `ReducedMotion`; `animate={false}` renders a motion-free tree.
- `@floating-ui/react ^0.27` and `motion ^12` are already direct `packages/ui` deps.

## Design

### 1. API and mode resolution — `labels` prop kept

Keep the existing prop shape (no breaking swap); change only its defaults and add the auto mode:

```ts
export type PieLabels = {
	/** Percent-share label inside each slice (AG's "sectorLabel"). */
	segment?: boolean
	/** Named card outside each slice (AG's "calloutLabel"). */
	callouts?: boolean
}
export type PieBaseProps<T> = ChartBaseProps<T> & {
	series: [PieChartSeries<T>]
	labels?: PieLabels
}
```

Resolution — **auto** engages only when neither key is set (both `undefined`); any set key supersedes:

| `labels` | result |
| --- | --- |
| `undefined` / `{}` | **auto**: callouts when the solve fits, else segment labels (new default — labels on) |
| `{ callouts: true }` | callouts always (measured layout still applies; overflow degrades per §7, never auto-switches) |
| `{ segment: true }` | sector labels only, fit-gated as today |
| `{ callouts: true, segment: true }` | both layers (AG parity: share inside, name outside) |
| `{ callouts: false }` | auto with callouts removed from the candidates → segment |
| `{ segment: false }` | auto with segment removed → callouts if they fit, else nothing |
| `{ callouts: false, segment: false }` | no labels |

`resolvePieLabels` returns `{ segment: boolean, callouts: boolean, auto: boolean }`; `auto` drives the fit-decides-mode branch. Inner keys stay `segment`/`callouts` (kept prop) though AG's terms are `sectorLabel`/`calloutLabel` — noted in the TSDoc. Booleans only; the object form (`{ maxWidth?, formatter? }`) is the reserved widening.

### 2. Anatomy — leaderless Panel cards centered on sectors

- **Each sector → one card**: a `motion.div` in an `aria-hidden pointer-events-none absolute inset-0` overlay rendered as a **sibling of `ChartPlotBox` inside the plot region** (the tooltip's slot — outside the box's `overflow-hidden`, so a card at the edge is never clipped). The plot region (`data-slot="chart-plot"`, `relative`) is the offsetParent.
- **Surface**: the card wears the shared panel chrome — `cn(k.content({ size: 'sm' }), k.surface[glass ? 'glass' : 'default'])` from `kata/tooltip`, reading `useGlass()` — so it is pixel-identical to a Tooltip/Popover panel: translucent `bg.popover` fill (or transparent glass), `backdrop-blur`, ring. Over the slice colours near the arc this reads as frosted glass; the translucent fill is what keeps the text legible over varying slice hues — the reason a card beats bare SVG text here.
- **No leader.** Association is spatial: the card's cross-axis center aligns to the point where the sector's mid-angle radial exits the pie (`at(cx, cy, r, mid)`), so it reads as belonging to that sector without a line.
- **Container-edge contract (main axis, pixel-flush)**: right-side cards' right edge = plot-region right edge; left-side cards' left edge = x 0. x comes from the region rect, never an offset off the anchor. Ragged edge faces the pie.
- **Content**: name span + share span. Name clamps at two lines (`line-clamp-2 break-words`); share is its own `whitespace-nowrap tabular-nums` element — beside a short name, on its own line under a wrapped one — so a clamped name can never eat the datum. Text is chrome-muted (`text.muted`), `font-medium text-xs`.
- **Side split** by `sin(mid)` (right when `≥ 0`), as `pieCallouts` does today. Near-vertical sectors ride the top/bottom of their side's column. Left/right columns (not full radial 4-way) — that is where the vertical room is and it keeps declumping one-dimensional; "centered to sector" is satisfied by the card's center-y tracking the sector.
- **Emphasis**: each card takes `sliceGroupClass(emphasis, index)` so it dims with its slice under legend hover.

### 3. The solve (pure core)

New `pie-chart/callout-layout.ts`, React-free like the existing geometry:

```ts
solveCallouts(input: {
	frame: { width: number; height: number }
	slices: { index: number; mid: number; share: number }[]
	sizes: Map<number, { width: number; height: number }>   // measured card boxes
	r0: number                                              // unshrunk radius
}): {
	mode: 'callout' | 'sector'                              // auto verdict; a forced mode ignores it
	radius: number
	placed: { index: number; side: 1 | -1; x: number; y: number }[]   // x = flush edge, y = card top
	dropped: number[]                                       // forced-mode overflow, smallest share first
}
```

- Per-side gutter `g_s = min(max(card widths on s), CARD_MAX_WIDTH)`; `CARD_GAP` is the clearance between the arc and a card's inner edge.
- `r = min(W/2 − max(g_L, g_R) − CARD_GAP, H/2 − vPad)`, floored at `r_min = max(56, 0.6·r₀)`.
- Dynamic max-width: cards render at `maxWidth = min(CARD_MAX_WIDTH, W/2 − r_min − CARD_GAP)` **before** measuring, so measurement already reflects wrap; clamp-2 + the share line bound height.
- Declump per side: sort by ideal center-y (`at(cx,cy,r,mid).y`), push each down by `h_prev + LABEL_VGAP`, slide the run back into `[0, H]` — today's declump generalized to real measured heights. Ideal-y order = angular order per side, so cards never leapfrog their neighbours.
- Fit verdict: `r ≥ r_min` ∧ per side `Σh + gaps ≤ H`. Auto: fit → callout at `r`; else → sector at `r₀`. Hysteresis: callout → sector at `r < r_min`, back at `r ≥ r_min + 8`, so a resize near the threshold doesn't flap.
- Constants (tune in review): `CARD_MAX_WIDTH = 176`, `CARD_GAP = 12`, `LABEL_VGAP = 6`, floor `max(56, 0.6·r₀)`.

### 4. floating-ui integration

Each card runs `useFloating({ strategy: 'absolute' })` — inline, not portaled — so `floatingStyles` resolve against the overlay's positioned ancestor (the plot region), keeping edges frame-exact without client-space math or N portal nodes:

- **Virtual reference**: `getBoundingClientRect` returns a zero-size rect at the sector's mid-angle edge point.
- **`whileElementsMounted: autoUpdate`** (`elementResize: true`): re-solve when a card's box changes (font swap, data/format change, zoom) or ancestors move — the layout-shift awareness the request asks for. Container width already re-renders through `usePlotFrame`; autoUpdate covers the rest.
- **Middleware**: `offset(CARD_GAP)` → custom `edgeColumn` (writes flush-edge x + declumped y from the shared solve) → `shift({ padding })` (final in-bounds clamp) → `size` (applies dynamic maxWidth) → `hide` (flags an unplaceable card in forced mode).
- `edgeColumn` reads one **generation-keyed solve** (key: frame size + slice hash + sizes hash); the first card of a generation runs `solveCallouts`, siblings read the memo. Inter-card collision is inherently global; sourcing it from a shared solve inside custom middleware is floating-ui's documented extension model. `detectOverflow` (boundary = plot region) supplies fit math so padding/border handling stays floating-ui's.
- The hook (`use-pie-callouts.ts`) orchestrates: render cards hidden at max-width → measure (`useLayoutEffect`, so the solved radius commits before paint — no r₀→r pop on static charts) → solve → commit `{ mode, radius, placed }` as one equality-guarded state → position + reveal. The autoUpdate→setState loop is generation-keyed and equality-guarded (the floating-ui feedback footgun, handled explicitly).

### 5. Frame height policy

Policy surface unchanged: explicit `height`/`aspectRatio` win; default stays `content` fit. The char-estimate `calloutRoom` survives only as the **pre-measure reserve** (box holds steady before first paint); after the solve, commit the exact height `max(2·(r + vPad), tallest side stack)`. Height growth never shrinks `r` (width-bound), so the refinement is monotone and settles in one extra pass. Width stays the only observed axis — no ResizeObserver loop.

### 6. Animation

Slices always render at **final geometry**; the intro shrink is a uniform group `scale` about the center — no `d`-string tweening (the roadmap's known hazard), gaps land at exactly `MARK_GAP` when scale settles at 1.

- 0 → 0.8s: existing sweep, slice group held at `scale = r₀/r` (visually full-size). Cards hidden.
- 0.65 → ~1.1s: group scale eases `r₀/r → 1` (easeOut, `SLICE_SWEEP`'s family), overlapping the sweep's tail so it reads as one gesture.
- 0.7s →: per card, staggered ~30ms in angular order — the card fades + scales in on the tooltip motion tokens (`ugoki.tooltip`: opacity 0→1, scale 0.95→1), arriving as the pie contracts, reading as the pie making room. No leader to draw.
- Donut center children don't scale.
- Reduced motion: `ReducedMotion` strips transforms — sweep, group scale, card scale skip; fades remain.
- `animate={false}`: no motion runtime; cards appear once placed (pre-paint, per §4).
- Re-layouts (data, legend toggle, resize): no sweep; slices swap instantly (existing); card position/opacity transition only under `animate`.

### 7. Fallbacks and degradation

- Auto: fit → callouts; no fit → sector labels at `r₀` (per-slice fit-gated, as today). Chart-level switch, never per-slice mixing — a half-and-half pie reads as broken.
- Forced callouts: radius clamps at the floor; cards that still can't stack drop smallest-share-first (omitted, never clipped — house rule); tooltip and table still carry them.
- Legend default flips with the resolved mode: active callouts name every slice spatially (colour is not the sole channel), so the legend defaults **off**; sector/auto-sector keeps today's default (on for ≥ 2 slices). Explicit `legend` always wins. **(Confirmed.)**

### 8. Accessibility

The card overlay is `aria-hidden` like the SVG it annotates; the visually-hidden `ChartTable` stays the AT surface, unchanged. Card ink is the chrome-muted tone on the panel fill, same contrast basis as the tooltip.

### 9. Files and tests

| File | Change |
| --- | --- |
| `pie-chart/callout-layout.ts` | new — pure solver + hysteresis; Vitest over synthetic sizes (mixed-height declump, flush x per side, radius/floor, verdicts, drop order, no leapfrog) |
| `pie-chart/use-pie-callouts.ts` | new — measurement, floating-ui wiring, generation cache, state commit |
| `pie-chart/pie-callout-labels.tsx` | new — HTML card overlay (panel surface + motion), no SVG |
| `chart-pie.tsx` | mode resolution (`auto`), group-scale choreography, wire overlay, delete `calloutRoom`/char estimates + `PieCallouts` SVG renderer |
| `pie-chart/pie-chart-geometry.ts` | keep `pieSlices`; retire `pieCallouts`/`declumpLabels`/leader constants (fold declump into the solver); keep exports pure |
| `chart-constants.ts` | `CARD_MAX_WIDTH`, `CARD_GAP`, `LABEL_VGAP`, floor + settle/stagger timings; drop `CALLOUT_LEADER/NUB/GAP/LINE` |
| `pie-chart.tsx` / `donut-chart.tsx` / `chart-schema.ts` | TSDoc for new defaults + auto mode; prop shape unchanged |
| demos, `pie-chart.test.tsx`, `docs/MODULES.md` | default now shows labels — update the "No labels" demo to an explicit off; leader assertions removed, card-slot + mode-verdict assertions added; component tests stub measurement (jsdom); real pixel-flush belongs in `vitest.browser.config.ts` |

SSR/fixed-`width`: cards measure client-side only; server HTML shows the pie at `r₀` cards-hidden, hydration corrects pre-paint.

## Decisions

1. **`labels` prop kept**, defaults now auto (labels on). *(Confirmed.)*
2. **Legend defaults off when callouts render.** *(Confirmed.)*
3. **Panel-surface cards, no leader, centered to sector.** *(Confirmed.)* — reusing the surface *recipe* (`kata/tooltip`'s `k.content`/`k.surface`/`k.motion`) on an inline `motion.div`, not the full `createPanel` slot family (Title/Body/Footer is overkill for a two-line card) nor a portaled `TooltipContent` (breaks frame-exact edges, adds N portals). Same classes → identical look. Flag: if you want the literal `TooltipContent` component reused, it's a small swap.
4. **My judgement (per your call):** centered pie with a symmetric radius (recentering on toggle would read as drift); starting constants `CARD_MAX_WIDTH 176`, floor `0.6·r₀ / 56px`, hysteresis 8px, stagger 30ms — tuned against the demos in review.
