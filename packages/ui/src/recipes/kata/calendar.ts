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

const base = ['inline-flex flex-col', 'select-none', 'density-w-[52,68,80]']

const header = [flex.row, 'justify-between', 'density-mb-[1,2,3]']

const footer = [flex.row, 'justify-center', 'density-gap-[1,2,3]']

const pickerGrid = ['grid grid-cols-3', 'density-px-[2,3,4]']

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
