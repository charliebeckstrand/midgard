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

export const k = {
	wrapper: ['relative', flex.col, 'gap-2'],
	sticky: {
		wrapper: 'overflow-auto [&>[data-slot=table]]:!overflow-visible',
		head: ['sticky top-0 z-10', bg.surface],
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
		// Full-height grab area on the column's trailing edge, centering the grip.
		handle: [
			'group/grid-resize absolute top-0 right-0 z-10 h-full w-1.5',
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
		// Filter popover panel: roomy so the value input has space alongside the operator.
		popover: ['w-[32rem]', 'max-w-[calc(100vw-2rem)]'],
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
	},
	rowLoading: [css.pulse, 'opacity-60'],
} as const
