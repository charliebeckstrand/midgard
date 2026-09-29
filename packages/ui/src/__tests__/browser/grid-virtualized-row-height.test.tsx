import { describe, expect, it } from 'vitest'
import type { DensityStep } from '../../core/density'
import { Grid, type GridColumn } from '../../modules/grid'
import { present, renderUI, screen, waitFor, windowBody } from '../helpers'

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

	/** Renders a windowed grid at `size`, and returns its body once rows render. */
	async function windowAt(size: DensityStep) {
		const view = renderUI(
			<div style={{ width: '320px' }}>
				<Grid
					virtualize
					size={size}
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

		for (const size of ['sm', 'lg'] as const) {
			const { body, unmount } = await windowAt(size)

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
	it('keeps the scroll position and the rows when the density changes', async () => {
		const ui = (size: DensityStep) => (
			<div style={{ width: '320px' }}>
				<Grid
					virtualize
					size={size}
					maxHeight="240px"
					columns={columns}
					rows={rows}
					getKey={(row) => row.id}
				/>
			</div>
		)

		const view = renderUI(ui('md'))

		const body = windowBody(view.container)

		await waitFor(() => expect(body.querySelector('tr[data-grid-row]')).not.toBeNull())

		const scroll = present(body.closest<HTMLElement>('[data-slot="grid-scroll"]'), 'the scroller')

		scroll.scrollTop = 4000

		await waitFor(() => expect(screen.queryByText('Name 1')).toBeNull())

		view.rerender(ui('lg'))

		// The window stays mounted through the new measure: no skeleton row takes
		// its place, so the scroll range holds and the reader keeps the place.
		expect(body.querySelector('tr[data-grid-placeholder]')).toBeNull()

		await waitFor(() => expect(rowHeight(body)).toBeGreaterThan(0))

		expect(scroll.scrollTop).toBeGreaterThan(2000)
	})
})
