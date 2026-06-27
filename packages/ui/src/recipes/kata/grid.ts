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
	wrapper: ['relative', flex.col, 'gap-2'],
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
		handle: [
			flex.inline,
			'shrink-0',
			text.muted,
			fg.hover,
			focus.ring,
			'cursor-grab touch-none select-none active:cursor-grabbing',
		],
	},
	resize: {
		// Fixed layout + a <colgroup> of exact widths so resizing one column
		// changes only that column (and the table's total width) instead of
		// redistributing across siblings; the table scrolls horizontally past its
		// container in the Table's own overflow wrapper.
		fixed: 'table-fixed',
		// The header cell hosts the absolutely-positioned handle.
		cell: 'relative',
		// Density-scaled trailing padding projected onto resizable headers so their
		// labels clear the handle; lives on the `<table>` element.
		padding: resizePadding,
		// Full-height grab area straddling the column's trailing edge, centering the
		// grip. Widened from a hairline and pulled half its width past the boundary
		// (`translate-x-1/2`) so the hit target spans the edge rather than a 6px
		// sliver — far easier to land with a pointer (toward WCAG 2.5.8) — while the
		// inner grip stays a thin line on the boundary.
		handle: [
			'group/grid-resize absolute top-0 right-0 z-10 h-full w-4 translate-x-1/2',
			'flex items-center justify-center',
			'cursor-col-resize touch-none select-none outline-none',
		],
		// Always-visible grip (mirrors the Resizable handle): tints on hover and
		// turns accent on keyboard focus or active drag. Focus shows as a colour
		// change, not an outset ring, so the scroll container can't clip it.
		grip: [
			'h-6 w-0.5',
			rounded.full,
			...mode(
				'bg-zinc-300 group-hover/grid-resize:bg-zinc-400',
				'dark:bg-zinc-600 dark:group-hover/grid-resize:bg-zinc-500',
			),
			'group-focus-visible/grid-resize:bg-blue-500 dark:group-focus-visible/grid-resize:bg-blue-500',
			'group-data-[resizing]/grid-resize:bg-blue-500 dark:group-data-[resizing]/grid-resize:bg-blue-500',
		],
	},
	filter: {
		// Footer below the table. From `lg`: one centered row — page-size picker,
		// page navigation, then the row-range status — gapped, not spread. Below
		// `lg`: the navigation stacks on top, with the picker and status sharing a
		// justified-between row beneath it (the `meta` wrapper collapses to
		// `contents` at `lg` so all three become siblings of the centered row).
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
		// Footer below the table. From `lg`: one centered row — page-size picker,
		// page navigation, then the row-range status — gapped, not spread. Below
		// `lg`: the navigation stacks on top, with the picker and status sharing a
		// justified-between row beneath it (the `meta` wrapper collapses to
		// `contents` at `lg` so all three become siblings of the centered row).
		bar: [
			'flex',
			'flex-col',
			'gap-2',
			'pt-2',
			'lg:flex-row',
			'lg:items-center',
			'lg:justify-center',
		],
		// Page navigation: centered on its own row below `lg`, the middle item from `lg`.
		nav: ['flex', 'justify-center'],
		// Picker + status: a justified-between row below `lg`; dissolves into the
		// centered row from `lg` so each orders independently.
		meta: ['flex', 'items-center', 'justify-center', 'gap-2'],
		start: [
			flex.inline,
			'items-center',
			'gap-2',
			size.sm,
			text.muted,
			'whitespace-nowrap',
			// Without a page-size picker the wrapper is empty; keep it on the small
			// screen so the status stays right (justified between), drop it from the
			// centered row so it adds no phantom gap.
			'lg:empty:hidden',
		],
		status: [size.sm, text.muted, 'whitespace-nowrap'],
		// "Go to page" control: label + a narrow number input, inline with the picker.
		jump: [flex.inline, 'items-center', 'gap-2', size.sm, text.muted, 'whitespace-nowrap'],
		jumpInput: 'w-16',
	},
	rowLoading: [css.pulse, 'opacity-60'],
	row: {
		// A clickable row (`onRowClick`): pointer cursor, a hover tint so the row
		// reads as actionable, and a keyboard focus ring (it is a tab stop).
		// Interactive cell content (buttons, the select checkbox) still handles its
		// own clicks; the row guard skips those.
		clickable: [
			'cursor-pointer',
			focus.ring,
			...mode('hover:bg-zinc-50', 'dark:hover:bg-zinc-800/40'),
		],
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
