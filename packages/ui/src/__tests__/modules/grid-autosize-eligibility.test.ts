import { describe, expect, it } from 'vitest'
import type { GridColumn } from '../../modules/grid'
import { isAutoSized } from '../../modules/grid/grid-column-measure'

/** No drag-holds and no width-releases — the initial state of a fresh grid. */
const NONE: ReadonlySet<string> = new Set()

describe('isAutoSized', () => {
	type Row = { id: number; name: string }

	/** A data column named `name`, with the given overrides. */
	const column = (over: Partial<GridColumn<Row>> = {}): GridColumn<Row> => ({
		id: 'name',
		title: 'Name',
		cell: (row) => row.name,
		...over,
	})

	it('auto-sizes a width-less data column', () => {
		expect(isAutoSized(column(), NONE, NONE)).toBe(true)
	})

	it('holds a width-seeded column out of the fit', () => {
		// `width` is the initial size; the column sits out the distribution until released.
		expect(isAutoSized(column({ width: '200px' }), NONE, NONE)).toBe(false)
	})

	it('auto-sizes a width-seeded column once released', () => {
		// "Auto-size columns" drops the id into `released`, so it rejoins the fit.
		expect(isAutoSized(column({ width: '200px' }), NONE, new Set(['name']))).toBe(true)
	})

	it('holds a drag-pinned column whether or not it was width-seeded', () => {
		expect(isAutoSized(column(), new Set(['name']), NONE)).toBe(false)

		expect(isAutoSized(column({ width: '200px' }), new Set(['name']), new Set(['name']))).toBe(
			false,
		)
	})

	it('never auto-sizes a non-data column', () => {
		const select: GridColumn<Row> = { id: 'select', selectable: true }

		expect(isAutoSized(select, NONE, NONE)).toBe(false)
	})

	it('treats a non-px width as auto-sized: a relative width is not a fixed seed', () => {
		expect(isAutoSized(column({ width: '50%' }), NONE, NONE)).toBe(true)
	})
})
