/**
 * Calendar kata: object-literal surface for `<Calendar>`'s month grid and its
 * month/year `picker`. The `base`, `header`, `footer`, `weekday`, and
 * `picker.grid` slots take the step of the nearest density scope through
 * stepped classes; the `grid`, `day` (with active/range-edge state classes),
 * and `skeleton` slots are static.
 */
import { iro, ji, kokkaku, narabi, sen } from '../kiso'

const { palette, text } = iro
const { weight } = ji
const { flex } = narabi
const { focus } = sen

const base = ['inline-flex flex-col', 'select-none', kokkaku.calendar.width]

const header = [flex.row, 'justify-between', 'density-mb-[1,2,3]']

const footer = [flex.row, 'justify-center', 'density-gap-[1,2,3]']

/**
 * The cap on the hit areas of a grid of cells (`TouchTarget`). The cells touch,
 * so each hit area keeps to its cell and two adjacent cells do not overlap.
 */
const cellTargets = '[--touch-target-gap-x:0px] [--touch-target-gap-y:0px]'

const pickerGrid = ['grid grid-cols-3', 'density-px-[2,3,4]', cellTargets]

const weekday = [
	flex.row,
	'justify-center',
	'w-full aspect-square',
	weight.medium,
	text.muted,
	'density-text-[xs,sm,base]',
]

export const k = {
	base,
	grid: `grid grid-cols-7 ${cellTargets}`,
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
