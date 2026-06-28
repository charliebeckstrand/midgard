/**
 * Data-table kata: object-literal surface for the table chrome that sits
 * around `kata/table` — sticky head, batch-action bar, sort controls, column
 * drag-reorder, and the row-loading pulse. No top-level variants axis; the only
 * sub-recipe is the `sort.icon`, inked or muted by whether its column is the
 * active sort.
 */
import { defineRecipe, mode } from '../../core/recipe'
import { hannou, iro, ji, kasane, narabi, omote, sen, ugoki } from '../kiso'

const { cursor, fg } = hannou
const { text } = iro
const { size, weight } = ji
const { rounded } = kasane
const { flex } = narabi
const { bg } = omote
const { border, focus } = sen
const { css } = ugoki

/** Sort-direction arrow: inked while its column is the active sort, muted otherwise. */
const sortIcon = defineRecipe({
	active: { true: text.default, false: text.muted },
	defaults: { active: false },
})

/**
 * Trailing padding for a resizable header so its label clears the resize handle,
 * scaled to the table's density. Projected from the `<table>` element onto the
 * resizable headers — those carrying `data-resizable` — so it overrides the
 * density cell padding at higher specificity without `!important`. Keyed by the
 * friendly density level the grid forwards to `<Table>`.
 */
const resizePadding = defineRecipe({
	density: {
		compact: '[&>*>tr>th[data-resizable]]:pr-2',
		snug: '[&>*>tr>th[data-resizable]]:pr-4',
		loose: '[&>*>tr>th[data-resizable]]:pr-6',
	},
	defaults: { density: 'snug' },
})

/**
 * Opaque fill behind a frozen body cell, so the columns scrolling under it stay
 * hidden. It tracks the content host (`omote.content` — the same viewport-aware
 * surface the sidebar layout paints behind its sticky headers): the card surface
 * at `lg`, and the flush page background below it. A plain `bg.surface` painted
 * the desktop card colour at every width, so on mobile — where the content block
 * is transparent over the darker page — the frozen columns read a shade off.
 */
const pinnedSurface = mode('bg-white', ['dark:bg-zinc-950', 'dark:lg:bg-zinc-900'])

export const k = {
	// Hosts the `group/grid` resize-state flag: while a column drag-resize is in
	// flight the wrapper carries `data-resizing`, which descendants read to stand
	// down their hover affordances and which paints the resize cursor grid-wide.
	wrapper: ['group/grid', 'relative', flex.col, 'gap-2', 'data-[resizing]:cursor-col-resize'],
	sticky: {
		wrapper: 'overflow-auto [&>[data-slot=table]]:!overflow-visible',
		head: ['sticky top-0 z-10', bg.surface],
	},
	pinned: {
		// Frozen data cell: opaque surface so the scrolling columns don't show
		// through, lifted just above the centre cells (below the z-10 sticky head,
		// so a vertical scroll still tucks pinned cells under it). The fill tracks
		// the content host across viewports (see `pinnedSurface`); the left/right
		// offset is an inline style summed from the engine.
		cell: ['sticky z-[1]', pinnedSurface],
		// Frozen header cell: above the sticky head so the top corner stays on top.
		// Matches the (sticky) header's own `bg.surface` so the header bar reads as
		// one piece, pinned cells included.
		head: ['sticky z-20', bg.surface],
		// Separating shadow at a frozen group's inner edge, cast toward the scroll.
		edgeLeft: ['shadow-[1px_0_3px_rgba(0,0,0,0.08)]', 'dark:shadow-[1px_0_3px_rgba(0,0,0,0.5)]'],
		edgeRight: ['shadow-[-1px_0_3px_rgba(0,0,0,0.08)]', 'dark:shadow-[-1px_0_3px_rgba(0,0,0,0.5)]'],
	},
	// The toolbar region above the table — see `GridToolbar`, the single home for
	// the grid's above-table controls. A vertical stack of the top control row and,
	// while a row is selected, the batch-action row beneath it.
	toolbar: {
		root: ['flex', 'flex-col', 'gap-2'],
		// Top row: the quick-search field at the start, the column-manager trigger at
		// the end. Stacks on narrow viewports, then lays out as a row from `sm`.
		bar: ['flex', 'flex-col', 'gap-2', 'sm:flex-row', 'sm:items-center'],
		// Column-manager cluster: pushed to the row's end from `sm` so it sits across
		// from the search field (and stays at the end even when it stands alone).
		actions: 'sm:ml-auto',
	},
	batch: {
		bar: [
			flex.row,
			'min-h-12',
			'gap-2',
			'px-2',
			'py-1',
			border.subtle,
			rounded.lg,
			'border-b',
			bg.tint,
		],
		count: [weight.medium, 'whitespace-nowrap', size.sm, text.muted],
	},
	selectCell: 'w-px text-center align-middle [line-height:0]',
	actionsCell: 'w-px whitespace-nowrap',
	cell: {
		// One-line cell content that truncates to an ellipsis at the column width.
		// `block` gives the span the cell's width so the fixed/auto column bounds it.
		truncate: ['block', 'truncate'],
		// Truncation tooltip surface: cap the width and let long text wrap inside.
		tooltip: ['max-w-xs', 'whitespace-normal', 'break-words'],
	},
	head: {
		// One-line header title that truncates to an ellipsis when it outgrows the
		// column. `min-w-0` overrides the flex item's `min-width: auto` so it shrinks
		// within the header's flex slot — and, for a sortable column, within the sort
		// button — instead of pushing past the cell into its neighbour.
		title: ['block', 'truncate', 'min-w-0'],
		// Leading group pairing a pinned column's pin button with its title. `min-w-0`
		// keeps the title shrinkable so it still truncates beside the button; `gap-1`
		// sets the button-to-title spacing.
		pinnedLabel: [flex.inline, 'min-w-0', 'gap-1'],
		// Pin button on a frozen column's header: an icon-only control that unpins the
		// column. Muted at rest, tinting and showing a focus ring on hover/focus —
		// matching the sort button — so it reads as the actionable affordance it is.
		pinButton: [flex.inline, 'shrink-0', text.muted, fg.hover, focus.ring, cursor, 'select-none'],
	},
	sort: {
		// `min-w-0` lets the button shrink within the header slot so its title can
		// truncate; the title carries the ellipsis while the sort arrow holds its size.
		button: [flex.inline, 'min-w-0', text.muted, fg.hover, focus.ring, cursor, 'select-none'],
		icon: sortIcon,
		// Priority number beside the arrow under a multi-column sort: small, muted,
		// tabular (so digits hold their box), and non-shrinking next to the title.
		badge: ['text-xs', 'leading-none', 'tabular-nums', 'shrink-0', text.muted],
	},
	reorder: {
		// Lift the actively dragged column above its neighbours and soften it. The
		// z-index only bites where the cell is a positioned box — sticky headers
		// already are; `shift` promotes the rest for the duration of the drag.
		cell: 'data-[dragging]:z-20 data-[dragging]:opacity-70',
		// Promotes a non-sticky reorder cell to `relative` while dragging so its
		// lift z-index takes effect.
		shift: 'data-[dragging]:relative',
		// Keeps the grip, title, and any sort control on one baseline. A block-level
		// flex (not inline) fills the header width so the title between the grip and
		// the filter button can shrink to an ellipsis instead of overrunning the cell.
		layout: [flex.row, 'min-w-0', 'gap-1'],
		// The grabbing cursor follows the live drag (`data-[dragging]`), not the
		// pointer's `:active` state: a right-click presses the grip `<button>` into
		// `:active` too, and the context menu swallowing the matching pointerup
		// would leave that cursor stuck as if the column were still held.
		handle: [
			flex.inline,
			'shrink-0',
			text.muted,
			fg.hover,
			focus.ring,
			'cursor-grab touch-none select-none data-[dragging]:cursor-grabbing',
		],
	},
	resize: {
		// Fixed layout + a <colgroup> of exact widths so resizing one column
		// changes only that column (and the table's total width) instead of
		// redistributing across siblings; the table scrolls horizontally past its
		// container in the Table's own overflow wrapper.
		fixed: 'table-fixed',
		// Marks a resizable header as the grip's hover host: hovering anywhere on the
		// header cell reveals its (otherwise hidden) grip. Pairs with the handle's
		// own `group/grid-resize`, which reveals the grip when the pointer is on the
		// full-height edge strip running down past the header. While a drag-resize is
		// in flight (the wrapper's `data-resizing`), every host drops its pointer
		// events so the dragging pointer — sweeping across the full-height strips —
		// can't flash other columns' grips; the active column's grip stays lit
		// through its handle's own `data-resizing`, which this never gates.
		host: ['group/grid-col', 'group-data-[resizing]/grid:pointer-events-none'],
		// Anchors the absolutely-positioned handle (non-sticky headers only — a
		// sticky header is already a positioned containing block).
		cell: 'relative',
		// Density-scaled trailing padding projected onto resizable headers so their
		// labels clear the handle; lives on the `<table>` element.
		padding: resizePadding,
		// Grab area along the column's trailing edge, anchored to the inside of that
		// edge (`right-0`, no outward shift) and widening leftward into the cell to a
		// comfortable ~24px target (toward WCAG 2.5.8). It deliberately does not
		// overhang the boundary: an outward overhang (a former `translate-x-1/2`) was
		// painted over by the next sticky header's opaque cell — clipping the grip to
		// a sliver across the header — and, on the trailing column, pushed past the
		// table's edge to inflate the horizontal scroll (nudging a right-pinned column
		// at the scroll end). Spans the column's full height — header through the last
		// row — via the measured `--grid-resize-height`, so a drag can begin anywhere
		// down the right side, not just the header (falling back to the header height
		// until measured).
		handle: [
			'group/grid-resize absolute top-0 right-0 z-10 w-6 h-[var(--grid-resize-height,100%)]',
			'flex items-center justify-end',
			'cursor-col-resize touch-none select-none outline-none',
		],
		// Full-height grip line — a 2px rounded bar matching the `ResizableHandle`
		// grip (`kata/resizable`) so every resize affordance reads the same width —
		// flush against the column's trailing edge (so it sits within the cell and
		// stays clear of the neighbour's opaque sticky header), hidden until the edge
		// is hovered, and shown on keyboard focus or active drag: tints on hover,
		// turns accent on focus or drag. Focus shows as a colour change, not an outset
		// ring, so the scroll container can't clip it.
		grip: [
			'h-full w-0.5',
			rounded.full,
			'opacity-0 transition-opacity',
			'group-hover/grid-resize:opacity-100',
			'group-focus-visible/grid-resize:opacity-100 group-data-[resizing]/grid-resize:opacity-100',
			...mode(
				'bg-zinc-300 group-hover/grid-resize:bg-zinc-400',
				'dark:bg-zinc-600 dark:group-hover/grid-resize:bg-zinc-500',
			),
			'group-focus-visible/grid-resize:bg-blue-500 dark:group-focus-visible/grid-resize:bg-blue-500',
			'group-data-[resizing]/grid-resize:bg-blue-500 dark:group-data-[resizing]/grid-resize:bg-blue-500',
		],
	},
	filter: {
		// Quick-search / per-column filter input above the table: full width, capped
		// narrow from `sm`.
		bar: ['w-full', 'sm:max-w-xs'],
		// Per-column filter row beneath the header.
		row: bg.surface,
		cell: ['px-2', 'py-1', 'align-middle'],
		// Header row: title on the left, filter button across from it on the right.
		slot: ['flex', 'items-center', 'justify-between', 'gap-1'],
		// Filter icon button in a column header: layout only. The active accent comes
		// from the Button's `color` prop; `idle` is the resting muted tint, dropped
		// when active so it doesn't override that colour.
		button: ['shrink-0'],
		idle: [text.muted, fg.hover],
		// Reset button in the filter sheet's footer: an auto right-margin pushes it
		// to the left edge, across from the right-justified Cancel / Apply pair.
		reset: 'mr-auto',
	},
	footer: {
		// Footer below the table, laid out as three zones. From `lg`: one row with
		// the row-range status at the start, the page navigation centered, and the
		// page-size picker at the end — each zone an equal `flex-1` track so the
		// navigation stays centered whatever the side content. Below `lg`: the
		// navigation sits on its own row up top, with the
		// status and controls sharing a justified-between row beneath it (the `meta`
		// wrapper collapses to `contents` at `lg` so all three become siblings of the
		// one row, reordered status · nav · controls).
		bar: ['flex', 'flex-col', 'gap-2', 'pt-2', 'lg:flex-row', 'lg:items-center'],
		// Page navigation: centered on its own row below `lg`, the centered middle
		// track from `lg`.
		nav: ['flex', 'justify-center', 'lg:order-2', 'lg:flex-1'],
		// Status + controls: a justified-between row below `lg`; dissolves into the
		// footer row from `lg` so the status and controls order independently around
		// the centered nav.
		meta: ['flex', 'items-center', 'justify-between', 'gap-3', 'lg:contents'],
		// Row-range status ("1–10 of 47"): the start track from `lg`, the left of the
		// justified row below it.
		status: [size.sm, text.muted, 'whitespace-nowrap', 'lg:order-1', 'lg:flex-1'],
		// Page-size picker: the end track from `lg` (right-aligned), the right of the
		// justified row below it. Always rendered so the track holds even when empty,
		// keeping the nav centered.
		controls: [flex.inline, 'items-center', 'gap-4', 'lg:order-3', 'lg:flex-1', 'lg:justify-end'],
	},
	rowLoading: [css.pulse, 'opacity-60'],
	row: {
		// A clickable row (`onRowClick`): the pointer cursor and a keyboard focus
		// ring (the row is a tab stop). Its hover wash is the shared `<Table hover>`
		// variant `GridData` enables for a row click. Interactive cell content
		// (buttons, the select checkbox) handles its own clicks; the row guard skips
		// those.
		clickable: ['cursor-pointer', focus.ring],
	},
	nav: {
		// The `navigable` grid's `<table>` is the cursor's single tab stop; drop its
		// own focus outline so the active-cell ring is the sole, precise indicator.
		table: 'outline-0',
		// Active-cell cursor ring for a `navigable` read-only grid, driven by the
		// `data-active` the cell marker toggles onto the owning `role="gridcell"`
		// <td>. Inset so the scroll container can't clip it; accent blue, matching
		// the editable grid's active cell.
		cell: [
			'data-[active]:ring-2',
			'data-[active]:ring-inset',
			...mode('data-[active]:ring-blue-600', 'dark:data-[active]:ring-blue-500'),
		],
	},
} as const
