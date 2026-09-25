// @vitest-environment node
import {
	type ColumnDef,
	type ColumnSizingState,
	createTable,
	getCoreRowModel,
} from '@tanstack/react-table'
import { describe, expect, it } from 'vitest'
import { columnWidth, columnWidths } from '../../modules/grid/engine/grid-table/views'

/**
 * The grid holds each width as a value, read from the sizing state it owns. The
 * engine sizes a drag and a nudge from `column.getSize()`. The two must agree
 * on every column, or a drag starts from a width the header does not show.
 */
type Row = { name: string }

const defs: ColumnDef<Row>[] = [
	{ id: 'plain' },
	{ id: 'sized', size: 240 },
	{ id: 'floored', size: 30, minSize: 60 },
	{ id: 'capped', size: 500, maxSize: 320 },
	{ id: 'bounded', minSize: 80, maxSize: 200 },
]

function engineOf(sizing: ColumnSizingState) {
	const table = createTable<Row>({
		data: [],
		columns: defs,
		getCoreRowModel: getCoreRowModel(),
		state: { columnSizing: sizing },
		onStateChange: () => {},
		renderFallbackValue: null,
	})

	table.setOptions((prev) => ({ ...prev, state: { ...table.initialState, columnSizing: sizing } }))

	return table
}

describe('columnWidth', () => {
	it.each([
		['with no sizing state', {}],
		['with a width inside the bounds', { plain: 90, sized: 300, bounded: 120 }],
		['with a width under the floor', { floored: 10, bounded: 5 }],
		['with a width over the cap', { capped: 900, bounded: 999 }],
	])('agrees with the engine %s', (_, sizing: ColumnSizingState) => {
		const table = engineOf(sizing)

		for (const column of table.getAllLeafColumns()) {
			expect(columnWidth(column.columnDef, sizing[column.id])).toBe(column.getSize())
		}
	})

	it('keys each width by column id', () => {
		const table = engineOf({ sized: 260 })

		const widths = columnWidths(table.getAllLeafColumns(), { sized: 260 })

		expect(widths.get('sized')).toBe(260)

		expect(widths.get('plain')).toBe(table.getColumn('plain')?.getSize())
	})
})
