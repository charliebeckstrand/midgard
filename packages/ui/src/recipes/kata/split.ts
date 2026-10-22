/**
 * Split kata: the unit of `<Split>`. The `base` slot is the grid of the two
 * panes, with the responsive `orientation`, `ratio`, `gap`, and `align` axes.
 */
import { defineKata } from '../../core/recipe'
import { ma, narabi } from '../kiso'

/**
 * The grid template of each `orientation` and `ratio`. The tracks were an
 * inline `gridTemplate*` style before, and a style attribute has no
 * breakpoint. Each template also clears the template of the other axis, so
 * each rule writes both properties, and a breakpoint that changes the axis
 * replaces the template of the old axis.
 */
const TEMPLATES = [
	{ orientation: 'horizontal', ratio: '1/4', class: 'grid-cols-[1fr_3fr] grid-rows-none' },
	{ orientation: 'horizontal', ratio: '1/3', class: 'grid-cols-[1fr_2fr] grid-rows-none' },
	{ orientation: 'horizontal', ratio: '1/2', class: 'grid-cols-[1fr_1fr] grid-rows-none' },
	{ orientation: 'horizontal', ratio: '2/3', class: 'grid-cols-[2fr_1fr] grid-rows-none' },
	{ orientation: 'horizontal', ratio: '3/4', class: 'grid-cols-[3fr_1fr] grid-rows-none' },
	{ orientation: 'vertical', ratio: '1/4', class: 'grid-rows-[1fr_3fr] grid-cols-none' },
	{ orientation: 'vertical', ratio: '1/3', class: 'grid-rows-[1fr_2fr] grid-cols-none' },
	{ orientation: 'vertical', ratio: '1/2', class: 'grid-rows-[1fr_1fr] grid-cols-none' },
	{ orientation: 'vertical', ratio: '2/3', class: 'grid-rows-[2fr_1fr] grid-cols-none' },
	{ orientation: 'vertical', ratio: '3/4', class: 'grid-rows-[3fr_1fr] grid-cols-none' },
]

export const k = defineKata({
	base: 'grid',
	responsive: {
		/** Whether the panes lay out as columns or rows. The compound rules give the template. */
		orientation: { horizontal: '', vertical: '' },
		/** The share of the first pane. The compound rules give the template. */
		ratio: { '1/4': '', '1/3': '', '1/2': '', '2/3': '', '3/4': '' },
		gap: ma.gap,
		align: narabi.flex.align,
	},
	compound: TEMPLATES,
	defaults: { orientation: 'horizontal', ratio: '1/2', gap: 'lg' },
})
