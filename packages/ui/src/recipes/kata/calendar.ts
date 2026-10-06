/**
 * Calendar kata: object-literal surface for `<Calendar>`'s month grid and its
 * month/year `picker`. The `base`, `header`, `footer`, `weekday`, and
 * `picker.grid` slots take the step of the nearest density scope through
 * stepped classes. The `grid`, `day`, and `skeleton` slots are static. The
 * `day` slot holds the `active` state classes and the `range` edge classes.
 */
import { defineScale } from '../../core/density'
import { iro, ji, kokkaku, narabi, sen } from '../kiso'
import { dan } from '../kiso/dan'

const { palette, text } = iro
const { weight } = ji
const { flex } = narabi
const { focus } = sen

const base = ['inline-flex flex-col', 'select-none', kokkaku.calendar.width]

const header = [flex.row, 'justify-between', dan.space.calendar.header.bottom]

const footer = [flex.row, 'justify-center', dan.gap.default]

/**
 * The cap on the hit areas of a grid of cells (`TouchTarget`). The cells touch,
 * so each hit area keeps to its cell and two adjacent cells do not overlap.
 */
const cellTargets = '[--touch-target-gap-x:0px] [--touch-target-gap-y:0px]'

const pickerGrid = ['grid grid-cols-3', dan.space.tab.x, cellTargets]

const weekday = [
	flex.row,
	'justify-center',
	'w-full aspect-square',
	weight.medium,
	text.muted,
	dan.text.small,
]

export const k = {
	base,
	grid: `grid grid-cols-7 ${cellTargets}`,
	header,
	footer,
	picker: {
		grid: pickerGrid,
		current: [
			weight.semibold,
			palette.soft.bg.blue,
			palette.soft.text.blue,
			palette.soft.hover.blue,
		],
	},
	weekday,
	day: {
		base: 'w-full ring-inset',
		active: [...focus.virtual],
		// Each endpoint squares the corners that face the band. The sides are
		// logical, so the corners mirror with the grid in a right-to-left region.
		range: {
			start: 'rounded-e-none',
			end: 'rounded-s-none',
		},
	},
	skeleton: kokkaku.calendar,
} as const

/** The size scale of {@link Calendar}: the steps of its width, header margin, gap, and weekday text. */
export const scale = defineScale(
	dan.size.calendar.width,
	dan.space.calendar.header.bottom,
	dan.gap.default,
	dan.text.small,
)
