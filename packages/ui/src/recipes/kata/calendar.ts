/**
 * Calendar kata: the unit of the `<Calendar>` month grid and its month/year
 * picker. The `base`, `header`, `footer`, `weekday`, and `picker.grid` slots
 * take the step of the nearest density scope through stepped classes. The
 * `grid`, `day`, and `picker.current` slots are static. The `day.active` slot
 * holds the state classes of a day, and the `inner`, `start`, and `end` axes
 * of the `day.range` slot give the corner classes of a range band. `skeleton` is an extra.
 */
import { defineScale } from '../../core/density'
import { defineKata } from '../../core/recipe'
import { dan, iro, kokkaku, narabi, sen } from '../kiso'

const { hover, palette, text } = iro
const { flex, touch } = narabi
const { focus } = sen

const base = ['inline-flex flex-col', 'select-none', dan.size.calendar.width]

const header = [flex.row, 'justify-between', dan.space.calendar.header.bottom]

const footer = [flex.row, 'justify-center', dan.gap.default]

/**
 * The cap on the hit areas of a grid of cells (`TouchTarget`). The cells touch,
 * so each hit area keeps to its cell and two adjacent cells do not overlap.
 */
const cellTargets = [touch.flush.x, touch.flush.y]

const pickerGrid = ['grid grid-cols-3', dan.space.tab.x, cellTargets]

const weekday = [
	flex.row,
	'justify-center',
	'w-full aspect-square',
	'font-medium',
	text.muted,
	dan.text.small,
]

export const k = defineKata(
	{
		base,
		slots: {
			grid: ['grid grid-cols-7', cellTargets],
			header,
			footer,
			picker: {
				slots: {
					grid: pickerGrid,
					// The cell of the current month or year, when it is not the selected cell.
					current: ['font-semibold', palette.soft.blue, hover.soft.blue],
				},
			},
			weekday,
			day: {
				base: 'w-full ring-inset',
				slots: {
					// The ring of the active cell or control. Focus stays on the grid, so the
					// ring is virtual.
					active: [...focus.virtual],
					// Each endpoint squares the corners that face the band, and a day inside
					// the band squares each corner. The sides are logical, so the corners
					// mirror with the grid in a right-to-left region.
					range: {
						inner: { true: 'rounded-none', false: '' },
						start: { true: 'rounded-e-none', false: '' },
						end: { true: 'rounded-s-none', false: '' },
					},
				},
			},
		},
	},
	{ skeleton: kokkaku.calendar },
)

/** The size scale of {@link Calendar}: the steps of its width, header margin, gap, and weekday text. */
export const scale = defineScale(
	dan.size.calendar.width,
	dan.space.calendar.header.bottom,
	dan.gap.default,
	dan.text.small,
)
