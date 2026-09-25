import { describe, expect, it } from 'vitest'
import { Grid, type GridColumn } from '../../modules/grid'
import { renderUI } from '../helpers'

/**
 * A column resize moves the widths through the `<colgroup>`, and a visited cell
 * of the resized column measures its overflow through the settle store. The
 * sticky offsets of the frozen columns move through CSS variables on the
 * `<table>`. No row renders again, so no cell renderer runs, whatever the number
 * of rows.
 */
describe('Grid column resize', () => {
	type Row = { id: number; city: string; name: string }

	const rows: Row[] = Array.from({ length: 50 }, (_, id) => ({
		id,
		city: `City ${id}`,
		name: `Name ${id}`,
	}))

	// Counts each call of a cell renderer.
	function counter() {
		const count = { calls: 0 }

		const counted = (text: string) => {
			count.calls++

			return text
		}

		return { count, counted }
	}

	function settle(pinned: boolean) {
		const { count, counted } = counter()

		const columns: GridColumn<Row>[] = [
			{ id: 'city', title: 'City', cell: (row) => counted(row.city), pinned: pinned || undefined },
			{ id: 'name', title: 'Name', cell: (row) => counted(row.name), pinned: pinned || undefined },
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

		const { container, rerender } = renderUI(grid(120))

		expect(count.calls).toBeGreaterThan(0)

		count.calls = 0

		rerender(grid(60))

		return { calls: count.calls, table: container.querySelector('table') }
	}

	it('renders no row again when a column width settles', () => {
		expect(settle(false).calls).toBe(0)
	})

	it('renders no row again when the width of a frozen column settles', () => {
		const { calls, table } = settle(true)

		expect(calls).toBe(0)

		// The column after the resized one sticks at the new width.
		expect(table?.style.getPropertyValue('--grid-pin-l-1')).toBe('60px')
	})
})
