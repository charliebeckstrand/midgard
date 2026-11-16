/**
 * Calendar kata: the unit of the `<Calendar>` month grid and its month/year
 * picker. The `base`, `header`, `footer`, `weekday`, and `picker.grid` slots
 * take the step of the nearest density scope through stepped classes. The
 * `grid`, `days`, `day`, and `picker.current` slots are static. The `day.active` slot
 * holds the state classes of a day, and the `inner`, `start`, and `end` axes
 * of the `day.range` slot give the corner classes of a range band. `skeleton` is an extra.
 */
import { defineScale } from '../../core/density'
import { defineKata } from '../../core/recipe'
import { dan, iro, kokkaku, narabi, sen } from '../kiso'

const { hover, palette, text } = iro
const { flex, touch } = narabi
const { focus } = sen

/**
 * On a coarse pointer, the width has a floor of seven columns of 44 px, so
 * each day keeps the touch pitch (`touch.pitch`) at each step.
 */
const base = [
	'inline-flex flex-col',
	'select-none',
	dan.size.calendar.width,
	'pointer-coarse:min-w-77',
]

const header = [flex.row, 'justify-between', dan.space.calendar.header.bottom]

const footer = [flex.row, 'justify-center', dan.gap.default]

/**
 * The cells of a grid touch. The touch pitch keeps each hit area
 * (`TouchTarget`) to its cell, and on a coarse pointer it gives each cell the
 * coarse floor, so a finger does not hit the next cell. The popover of the
 * picker has no fixed width, so each column also takes the floor: the minimum
 * size of a cell does not widen a flexible column.
 */
const pickerGrid = [
	'grid grid-cols-3 pointer-coarse:grid-cols-[repeat(3,minmax(2.75rem,1fr))]',
	dan.space.tab.x,
	touch.pitch,
]

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
			grid: 'grid grid-cols-7',
			// The listbox of the days, under the weekday row.
			days: ['col-span-7 grid grid-cols-7', touch.pitch],
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
