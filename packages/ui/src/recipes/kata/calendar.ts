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
 * On a coarse pointer, the width gives each day a cell of 40, 44, or 48 px, so
 * the cells step as the density does.
 */
const base = [
	'inline-flex flex-col',
	'select-none',
	dan.size.calendar.width,
	dan.size.calendar.touch,
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
 * The listbox of the days. The days touch, so the hit area of each day keeps
 * to the day (`touch.flush`). On a coarse pointer, each day fills its square
 * cell, so the hit areas tile the grid.
 */
const days = ['col-span-7 grid grid-cols-7', touch.flush.x, touch.flush.y]

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
				// On a coarse pointer, the day is a square of the width of its column.
				base: ['w-full ring-inset', 'pointer-coarse:h-auto pointer-coarse:aspect-square'],
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

/**
 * The size scale of {@link Calendar}: `sm`, `md`, and `lg`, the steps of its
 * width and its header margin. In an `xs` or `xl` scope, the calendar opens a scope at its inner
 * neighbor (`useDensityScale`), so its header margin, gap, text, and buttons
 * take a step of the scale.
 */
export const scale = defineScale(dan.size.calendar.width, dan.space.calendar.header.bottom)
