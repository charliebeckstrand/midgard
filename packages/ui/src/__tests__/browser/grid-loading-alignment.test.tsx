import { describe, expect, it } from 'vitest'
import { Button } from '../../components/button'
import { Grid, type GridColumn } from '../../modules/grid'
import { renderUI, waitFor } from '../helpers'

/**
 * The loading body's placeholder row against a real layout engine: every
 * skeleton cell must sit in its own column, frozen columns included. Sticky
 * positioning only resolves in a browser (jsdom paints no layout), and the
 * regression this covers is geometric — a frozen column's placeholder that
 * doesn't stick lands under a scrolling neighbour, so the trailing column reads
 * as pushed aside while the grid loads.
 */
describe('grid loading row alignment (real browser)', () => {
	type Row = { id: number; customer: string; origin: string; destination: string }

	const columns: GridColumn<Row>[] = [
		{ id: 'id', title: 'Load ID', cell: (row) => row.id },
		{ id: 'customer', title: 'Customer', cell: (row) => row.customer },
		{ id: 'origin', title: 'Origin', cell: (row) => row.origin },
		{ id: 'destination', title: 'Destination', cell: (row) => row.destination },
		{ id: 'actions', title: 'Actions', actions: () => <Button>Edit</Button>, pinned: 'right' },
	]

	// Controlled widths sum to 1080px against a 480px viewport, so the grid
	// scrolls sideways and the right-pinned column has something to stick over.
	const sizing = { value: { id: 120, customer: 320, origin: 280, destination: 240, actions: 120 } }

	const rows: Row[] = Array.from({ length: 3 }, (_, i) => ({
		id: 1000 + i,
		customer: `Customer ${i}`,
		origin: `Origin ${i}`,
		destination: `Destination ${i}`,
	}))

	function setup(loading: boolean) {
		const { container } = renderUI(
			<div style={{ width: '480px' }}>
				<Grid
					resizable
					columns={columns}
					columnSizing={sizing}
					rows={rows}
					getKey={(row: Row) => row.id}
					loading={loading}
				/>
			</div>,
		)

		const headers = () => [...container.querySelectorAll<HTMLElement>('thead tr:last-child th')]

		const cells = () => [...container.querySelectorAll<HTMLElement>('tbody tr:first-child td')]

		return { container, headers, cells }
	}

	it('lines every loading placeholder up with its column header', async () => {
		const { headers, cells } = setup(true)

		await waitFor(() => expect(cells()).toHaveLength(columns.length))

		const head = headers()

		cells().forEach((cell, index) => {
			const column = head[index] as HTMLElement

			// Same left edge and same width as the header above it — including the
			// right-pinned actions column, which sticks in both rows.
			expect(cell.getBoundingClientRect().left).toBeCloseTo(column.getBoundingClientRect().left, 0)

			expect(cell.getBoundingClientRect().width).toBeCloseTo(
				column.getBoundingClientRect().width,
				0,
			)
		})
	})

	it('holds the pinned placeholder where the loaded row puts its cell', async () => {
		const loaded = setup(false)

		await waitFor(() => expect(loaded.cells()).toHaveLength(columns.length))

		const settled = (loaded.cells().at(-1) as HTMLElement).getBoundingClientRect().right

		const loading = setup(true)

		await waitFor(() => expect(loading.cells()).toHaveLength(columns.length))

		// The frozen column doesn't move between the loading and loaded bodies: the
		// rows land where the placeholders were, with no sideways jump.
		expect((loading.cells().at(-1) as HTMLElement).getBoundingClientRect().right).toBeCloseTo(
			settled,
			0,
		)
	})
})
