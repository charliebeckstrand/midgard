/**
 * Columns kata: the unit of `<Columns>`. The `base` slot is the grid, with the
 * responsive `columns`, `gap`, and `align` axes.
 */
import { defineKata } from '../../core/recipe'
import { ma, narabi } from '../kiso'

/** The template of each count of equal tracks. */
const TRACKS = {
	1: 'grid-cols-1',
	2: 'grid-cols-2',
	3: 'grid-cols-3',
	4: 'grid-cols-4',
	6: 'grid-cols-6',
}

/** The count of equal tracks in a row of `<Columns>`. */
export type ColumnCount = keyof typeof TRACKS

export const k = defineKata({
	base: 'grid',
	responsive: {
		columns: TRACKS,
		gap: ma.gap,
		align: narabi.flex.align,
	},
	defaults: { columns: 1, gap: 'lg' },
})
