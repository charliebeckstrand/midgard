import { describe, expect, it } from 'vitest'
import { Grid, type GridColumn } from '../../modules/grid'
import type { DensityLevel } from '../../providers/density'
import { present, renderUI, waitFor, windowBody } from '../helpers'

/**
 * The row estimate of a windowed grid without an `estimateSize`, in a real
 * browser. The grid measures its first row, so the spacers hold the true
 * height of every row at each density, and no number in code copies the cell
 * padding.
 */
describe('grid virtualized row height (real browser)', () => {
	type Row = { id: number; name: string }

	const columns: GridColumn<Row>[] = [{ id: 'name', title: 'Name', cell: (row) => row.name }]

	const rows: Row[] = Array.from({ length: 300 }, (_, i) => ({ id: i + 1, name: `Name ${i + 1}` }))

	/** Renders a windowed grid at `density`, and returns its body once rows render. */
	async function windowAt(density: DensityLevel) {
		const view = renderUI(
			<div style={{ width: '320px' }}>
				<Grid
					virtualize
					density={density}
					maxHeight="240px"
					columns={columns}
					rows={rows}
					getKey={(row) => row.id}
				/>
			</div>,
		)

		const body = windowBody(view.container)

		await waitFor(() => expect(body.querySelector('tr[data-grid-row]')).not.toBeNull())

		return { body, unmount: view.unmount }
	}

	/** The height of one rendered row. */
	function rowHeight(body: HTMLElement) {
		return present(body.querySelector<HTMLElement>('tr[data-grid-row]'), 'a row').offsetHeight
	}

	it('sizes the window from the measured row at each density', async () => {
		const heights: number[] = []

		for (const density of ['compact', 'loose'] as const) {
			const { body, unmount } = await windowAt(density)

			const height = rowHeight(body)

			// The spacers and the rendered rows together hold every row at its
			// real height, so the scroll range ends at the last row.
			expect(body.offsetHeight).toBe(rows.length * height)

			heights.push(height)

			unmount()
		}

		// The density moves the row height, and the estimate follows it.
		expect(heights[0]).toBeLessThan(heights[1] as number)
	})
})
