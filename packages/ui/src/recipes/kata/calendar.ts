/**
 * Calendar kata: the unit of the `<Calendar>` month grid and its month/year
 * picker. The `base`, `header`, `footer`, `weekday`, and `picker.grid` slots
 * take the step of the nearest density scope through stepped classes. The
 * `grid`, `days`, `day`, and `picker.current` slots are static. The
 * `day.active` slot holds the state classes of a day, and the `inner`,
 * `start`, and `end` axes of the `day.range` slot give the classes of a range
 * band. `skeleton` is an extra.
 */
import { defineScale } from '../../core/density'
import { defineKata } from '../../core/recipe'
import { dan, iro, kokkaku, narabi, sen } from '../kiso'

const { hover, palette, text } = iro
const { flex, touch } = narabi
const { focus } = sen

/**
 * On a coarse pointer, the width has a floor of seven columns of 44 px, so
 * each day has a cell of the touch pitch (`touch.pitch`) at each step.
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
 * The cells of the picker touch, and each cell has the touch pitch
 * (`touch.pitch`). The popover of the picker has no fixed width, so on a
 * coarse pointer each column takes the floor. On a coarse pointer, each month
 * or year fills the width of its column, so the hit areas meet.
 */
const pickerGrid = [
	'grid grid-cols-3 pointer-coarse:grid-cols-[repeat(3,minmax(2.75rem,1fr))]',
	'pointer-coarse:*:w-full',
	dan.space.tab.x,
	touch.pitch,
]

/**
 * The listbox of the days. `--ui-calendar-day` is the side of a day at each
 * step: the height of a button. On a coarse pointer, a day under the floor
 * keeps that side in the middle of its 44 px cell, and its hit area fills the
 * cell. A day at the floor or over it fills its column, as on a fine pointer.
 */
const days = ['col-span-7 grid grid-cols-7', dan.size.calendar.day, touch.pitch]

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
			days,
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
				// On a coarse pointer, the day takes the width of its column less the
				// part of the floor that its side does not fill: its side in a 44 px
				// column, and the full column at the floor or over it.
				base: [
					'w-full ring-inset',
					'pointer-coarse:w-[calc(100%-max(0px,2.75rem-var(--ui-calendar-day)))]',
				],
				slots: {
					// The ring of the active cell or control. Focus stays on the grid, so the
					// ring is virtual.
					active: [...focus.virtual],
					// Each endpoint squares the corners that face the band, and a day inside
					// the band squares each corner. The sides are logical, so the corners
					// mirror with the grid in a right-to-left region. On a coarse pointer,
					// each day of the band fills its column, so the band has no breaks.
					range: {
						inner: { true: 'rounded-none pointer-coarse:w-full', false: '' },
						start: { true: 'rounded-e-none pointer-coarse:w-full', false: '' },
						end: { true: 'rounded-s-none pointer-coarse:w-full', false: '' },
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
