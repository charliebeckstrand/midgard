/**
 * Calendar kata: object-literal surface for `<Calendar>`'s month grid and its
 * month/year `picker`. Size-axed sub-recipes (`base`, `header`, `footer`,
 * `weekday`, `picker.grid`) move with the `<Calendar>` size; the `grid`,
 * `day` (with active/range-edge state classes), and `skeleton` slots are
 * static.
 */
import { defineRecipe } from '../../core/recipe'
import { iro, ji, kokkaku, narabi, sen } from '../kiso'

const { palette, text } = iro
const { size, weight } = ji
const { flex } = narabi
const { border, focus } = sen

const base = defineRecipe({
	base: ['inline-flex flex-col', 'select-none'],
	size: {
		sm: 'w-52',
		md: 'w-68',
		lg: 'w-80',
	},
	defaults: { size: 'md' },
})

const header = defineRecipe({
	base: [flex.row, 'justify-between'],
	size: {
		sm: 'mb-1',
		md: 'mb-2',
		lg: 'mb-3',
	},
	defaults: { size: 'md' },
})

const footer = defineRecipe({
	base: [flex.row, 'justify-center'],
	size: {
		sm: 'gap-1',
		md: 'gap-2',
		lg: 'gap-3',
	},
	defaults: { size: 'md' },
})

const pickerGrid = defineRecipe({
	base: 'grid grid-cols-3',
	size: {
		sm: 'px-2',
		md: 'px-3',
		lg: 'px-4',
	},
	defaults: { size: 'md' },
})

const weekday = defineRecipe({
	base: [flex.row, 'justify-center', 'w-full aspect-square', weight.medium, text.muted],
	size: {
		sm: size.xs,
		md: size.sm,
		lg: size.md,
	},
	defaults: { size: 'md' },
})

export const k = {
	base,
	grid: 'grid grid-cols-7',
	header,
	footer,
	picker: {
		grid: pickerGrid,
		cellCurrent: [
			weight.semibold,
			palette.soft.bg.blue,
			palette.soft.text.blue,
			palette.soft.hover.blue,
		],
	},
	weekday,
	/**
	 * The `month` layout: a cell is a region with the date as one control and
	 * the caller's content under it, so nothing here is square and the frame
	 * fills what it is given rather than a fixed width.
	 */
	month: {
		/** Overrides `base`'s fixed width — a month grid is as wide as its container. */
		frame: 'w-full',
		/** The weekday header. Flat text rather than the picker's square, which a table row cannot hold. */
		weekday: [weight.medium, text.muted, 'p-1 text-left'],
		/**
		 * One cell.
		 *
		 * It carries no `display` of its own. A `<td>` set to `flex` leaves the
		 * table layout entirely — the rows stop being rows and every cell draws
		 * full width — so the column inside it is a box of its own, below.
		 */
		cell: ['align-top p-1', 'border-t border-l first:border-l-0', ...border.subtleColor],
		/** The cell's contents, stacked. The box that carries the layout the cell cannot. */
		stack: 'flex min-h-24 min-w-0 flex-col items-start gap-1',
		/** The date itself, which is the one control every cell carries. */
		date: 'w-auto min-w-8 justify-start',
		/** What the caller draws under the date: its own column, clipped to the cell. */
		content: 'flex w-full min-w-0 flex-col gap-0.5 overflow-hidden',
	},
	day: {
		base: 'w-full ring-inset',
		active: {
			base: [...focus.virtual],
			selected: ['bg-blue-600', ...focus.virtual],
		},
		range: {
			leftEdge: 'rounded-r-none',
			rightEdge: 'rounded-l-none',
		},
	},
	skeleton: kokkaku.calendar,
} as const
