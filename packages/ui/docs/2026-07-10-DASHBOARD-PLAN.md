# Dashboard Module — Feature Plan — 2026-07-10

A Grafana-style board for the chart family: draggable, resizable, gravity-compacted tiles behind one `ui/modules/dashboard` entry point. Companion to the module's [ROADMAP](../src/modules/dashboard/ROADMAP.md), which tracks status and backlog.

## Thesis

The chart module was shaped for dashboards — `data-tier` published for tile co-styling, a container-fill frame, a shared tile ratio — but nothing owned the board. This plan adds the board as its own module on a pure, immutable layout core: 24 columns, rows a quarter of a column's pitch so ratio-locked heights derive exactly (`round(4·w / ratio)` — equal ratios at equal spans hold equal heights by construction, never by rounding luck), react-grid-layout's proven compaction and displacement math for the Grafana feel, gestures that simulate from their start snapshot so reverts are free, hybrid drop semantics (swap on a tile's middle, insert on its edge bands), and a breakpoint-free responsive derivation driven by each tile's own minimum content width. Geometry is purely proportional CSS, so server markup is correct before any measurement and one positioning system serves every width.

## Current state (verified in tree, 2026-07-10)

- Pure core: `src/modules/dashboard/dashboard-layout.ts` (collision, gravity compaction with statics, displacement with the `moved` loop guard and depth-0 upward hops, origin swap, auto-slot append, derived heights), `dashboard-responsive.ts` (widen-and-wrap `deriveLayout` with the `identity` gate), `dashboard-intent.ts` (25/50/25 zones, Schmitt band, dwell), `dashboard-announcements.ts` (WCAG 4.1.3 strings).

- Components and hooks: `dashboard-grid.tsx` (DndContext + inlined DragOverlay, proportional root via `aspect-ratio`, kata column guides), `dashboard-item.tsx` (percentage cells, FLIP transform springs on `ugoki.spring`, handle minting, placeholder posture), `dashboard-handle.tsx`, `dashboard-resize-handle.tsx` (separator semantics, arrow / Shift / Home / End), `use-dashboard-layout.ts` (binding, constraint registry, auto-slot), `use-dashboard-drag.ts` (snapshot simulation, intent, keyboard cell stepping, announcements), `use-dashboard-resize.ts` (pointer capture per the resizable precedent, Escape / `pointercancel` / `contextmenu` revert).

- The seam: `src/primitives/drag-handle` — ambient `DragHandleContext` with a claim registrar; `chart-header.tsx` adopts and claims the handle, sliding the title over on the shared layout spring.

- Chart `header` prop: `ChartBaseProps.header?: string | ChartHeaderConfig` replaced `title` / `subtitle` across the module (`chart-schema.ts`, `chart-frame.tsx`, `chart-header.tsx` as a motion adornment row, `chart-pie.tsx` newly wired with real `headerLines`, heatmap and choropleth peels), with every in-repo call site migrated.

## Design sketch — increments

1. **Pure layout core + unit tests** — shipped.

2. **Chart `header` replace + pie wiring + migration** — shipped.

3. **Drag-handle primitive + static grid** (binding, auto-slot, guides, a11y case, docs indexes) — shipped.

4. **Drag** (snapshot simulation, hybrid intent, overlay, keyboard + announcements, events) — shipped.

5. **Resize** (splitters, keyboard, readout chip, clamps, events) — shipped.

6. **Polish** — backlog: RTL mirrored-interaction pass beyond the delta flip, autoscroll hardening in nested scroll containers, drag-overlay ghost fallback, benchmarks (`__benchmarks__`), item actions slot.

## Non-goals

- Per-breakpoint saved layouts: the responsive derivation is a pure render-time function and is never persisted (Grafana Scenes' choice).

- Editing while the derivation is active: gestures stand down whenever rendered ≠ canonical, since edits apply to the canonical layout.

- Grid-unit `minW` / `maxW` / `minH` / `maxH` clamps: `minWidth` px derives the floor; unit clamps wait for demand.

## Accessibility

- Drag: the grip is a real button (dnd-kit keyboard sensor — Space lifts, arrows step one cell, Escape cancels), with polite announcements naming position and drop meaning (WCAG 4.1.3).

- Resize: east / south strips are focusable `role="separator"` window splitters with `aria-valuenow/min/max` (the value change is the announcement); the corner is pointer-only and `aria-hidden` rather than a two-axis separator lie.

- Reduced motion skips the FLIP glide; the editing chrome joins the axe sweep via `a11y/cases/data-complex.tsx`.

## Tests

- Unit: `dashboard-layout.test.ts`, `dashboard-responsive.test.ts`, `dashboard-intent.test.ts`, `dashboard-announcements.test.ts` — the pure core.

- Render (jsdom, callback seams per CONVENTIONS §10.3 — no driven pointer lifecycles): `dashboard-grid.test.tsx`, `dashboard-handle.test.tsx`, `dashboard-resize.test.tsx`, `chart-header-config.test.tsx`.

- Browser (backlog): a drag-gesture journey over the docs demo once the browser suite grows a dnd harness.

## Docs surface

Per CLAUDE §3.5: TSDoc on every barrel export; `MODULES.md` lists `dashboard`; `PRIMITIVES.md` lists `drag-handle`; the module ROADMAP carries status; the demo lives at `src/docs/demos/modules/dashboard/`. `ChartHeaderConfig` joined the chart barrel and its TSDoc.

## Suggested PR slicing

| PR | Scope | Size |
|---|---|---|
| 1 | Plan doc + pure core + unit tests | M |
| 2 | Chart `header` replace + migration sweep | M |
| 3 | `primitives/drag-handle` + static grid + docs indexes | M |
| 4 | Drag interaction | L |
| 5 | Resize interaction | M |
| 6 | Polish: RTL pass, autoscroll hardening, benchmarks, ghost overlay | S |

---

**See also:** [`../src/modules/dashboard/ROADMAP.md`](../src/modules/dashboard/ROADMAP.md) · [`MODULES.md`](MODULES.md) · [`PRIMITIVES.md`](PRIMITIVES.md).
