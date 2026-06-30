import { describe, expect, it } from 'vitest'
import { Grid, type GridColumn } from '../../modules/grid'
import { fireEvent, renderUI, screen, waitFor } from '../helpers'

/**
 * The keyboard cursor over a virtualized grid (real browser; jsdom renders zero
 * windowed rows). A large jump (Ctrl+End) lands the cursor on a row outside the
 * rendered window — the cursor scrolls it into the window first, so the cell
 * `aria-activedescendant` names is really in the DOM (WCAG 2.1.1 / 4.1.2), not a
 * dangling reference to an unmounted row.
 */
describe('grid virtualized cursor (real browser)', () => {
	type Row = { id: number; name: string }

	const columns: GridColumn<Row>[] = [{ id: 'name', title: 'Name', cell: (row) => row.name }]

	const rows: Row[] = Array.from({ length: 200 }, (_, i) => ({ id: i + 1, name: `Name ${i + 1}` }))

	const getKey = (row: Row) => row.id

	it('scrolls an off-window row into view so the active cell stays mounted', async () => {
		renderUI(
			<div style={{ width: '320px' }}>
				<Grid
					navigable
					virtualize={{ estimateSize: 36 }}
					maxHeight="180px"
					columns={columns}
					rows={rows}
					getKey={getKey}
				/>
			</div>,
		)

		const grid = screen.getByRole('grid')

		// Only a window of rows renders, not all 200 — confirm virtualization is live.
		await waitFor(() => expect(screen.queryByText('Name 1')).not.toBeNull())

		expect(screen.queryByText('Name 200')).toBeNull()

		grid.focus()

		// Jump to the last row, far below the rendered window.
		fireEvent.keyDown(grid, { key: 'End', ctrlKey: true })

		// The cursor scrolled it into the window: the active descendant resolves to a
		// real cell rather than dangling at an unmounted row.
		await waitFor(() => {
			const active = grid.getAttribute('aria-activedescendant')

			expect(active).toBeTruthy()

			expect(document.getElementById(active as string)).not.toBeNull()
		})

		expect(screen.queryByText('Name 200')).not.toBeNull()
	})

	it('pages PageDown by the visible viewport, not the fixed fallback count', async () => {
		renderUI(
			<div style={{ width: '320px' }}>
				<Grid
					navigable
					virtualize={{ estimateSize: 36 }}
					maxHeight="180px"
					columns={columns}
					rows={rows}
					getKey={getKey}
				/>
			</div>,
		)

		const grid = screen.getByRole('grid')

		await waitFor(() => expect(screen.queryByText('Name 1')).not.toBeNull())

		grid.focus()

		fireEvent.keyDown(grid, { key: 'PageDown' })

		await waitFor(() => {
			const active = grid.getAttribute('aria-activedescendant')

			expect(active).toBeTruthy()

			const row = Number(/cell-(\d+)-\d+$/.exec(active as string)?.[1])

			// A ~180px viewport over ~36px rows pages ~4 rows: more than one, but fewer
			// than the fixed NAV_PAGE_STEP of 10 — so the step was measured, not constant.
			expect(row).toBeGreaterThanOrEqual(2)

			expect(row).toBeLessThan(10)
		})
	})
})
