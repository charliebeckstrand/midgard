import { describe, expect, it } from 'vitest'
import { Grid, type GridColumn } from '../../modules/grid'
import { renderUI } from '../helpers'

/**
 * A column resize moves the widths through the `<colgroup>`, and a visited cell
 * of the resized column measures its overflow through the settle store. No row
 * renders again, so no cell renderer runs, whatever the number of rows.
 */
describe('Grid column resize', () => {
	type Row = { id: number; city: string; name: string }

	const rows: Row[] = Array.from({ length: 50 }, (_, id) => ({
		id,
		city: `City ${id}`,
		name: `Name ${id}`,
	}))

	it('renders no row again when a column width settles', () => {
		let calls = 0

		// Counts each call of a cell renderer.
		const counted = (text: string) => {
			calls++

			return text
		}

		const columns: GridColumn<Row>[] = [
			{ id: 'city', title: 'City', cell: (row) => counted(row.city) },
			{ id: 'name', title: 'Name', cell: (row) => counted(row.name) },
		]

		const grid = (width: number) => (
			<Grid
				columns={columns}
				rows={rows}
				getKey={(row) => row.id}
				resizable
				truncate
				columnSizing={{ value: { city: width } }}
			/>
		)

		const { rerender } = renderUI(grid(120))

		expect(calls).toBeGreaterThan(0)

		calls = 0

		rerender(grid(60))

		expect(calls).toBe(0)
	})
})
