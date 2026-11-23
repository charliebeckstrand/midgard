/**
 * Columns kata: the units of `<Columns>` and `<ColumnsItem>`. The `base` slot
 * of `k` is the grid, with the responsive `columns`, `gap`, and `align` axes.
 * The `base` slot of `item` is one cell, with the responsive `span` axis.
 */
import { defineKata } from '../../core/recipe'
import { dan, narabi } from '../kiso'

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

/** The span of each count of tracks, and of each track of the row. */
const SPANS = {
	1: 'col-span-1',
	2: 'col-span-2',
	3: 'col-span-3',
	4: 'col-span-4',
	5: 'col-span-5',
	6: 'col-span-6',
	full: 'col-span-full',
}

/** The count of tracks that a cell of `<Columns>` spans, or `'full'` for each track of its row. */
export type ColumnSpan = keyof typeof SPANS

export const k = defineKata({
	base: 'grid',
	responsive: {
		columns: TRACKS,
		gap: dan.gap.scale,
		align: narabi.flex.align,
	},
	defaults: { columns: 1, gap: 'lg' },
})

export const item = defineKata({
	base: '',
	responsive: { span: SPANS },
})
