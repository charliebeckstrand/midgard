import { describe, expect, it } from 'vitest'
import { Grid, type GridColumn } from '../../modules/grid'
import { fireEvent, renderUI, screen, waitFor } from '../helpers'

/**
 * The navigable cursor keeps its active cell clear of the grid's sticky header
 * and pinned columns when it scrolls into view (WCAG 2.4.11, Focus Not
 * Obscured): the cell carries a `scroll-margin` sized to that sticky chrome, so
 * `scrollIntoView` leaves room for it. Only a real browser resolves sticky
 * layout (jsdom paints none), so the measurement is asserted here.
 */
describe('grid cursor focus not obscured (real browser)', () => {
	type Row = { id: number; name: string; role: string }

	const columns: GridColumn<Row>[] = [
		{ id: 'name', title: 'Name', cell: (row) => row.name, pinned: 'left' },
		{ id: 'role', title: 'Role', cell: (row) => row.role },
	]

	const rows: Row[] = Array.from({ length: 30 }, (_, i) => ({
		id: i + 1,
		name: `Name ${i + 1}`,
		role: i % 2 === 0 ? 'Admin' : 'User',
	}))

	const getKey = (row: Row) => row.id

	it('gives the active cell a scroll-margin matching the sticky header', async () => {
		renderUI(
			<div style={{ width: '320px' }}>
				<Grid
					navigable
					header={{ position: 'sticky' }}
					maxHeight="160px"
					columns={columns}
					rows={rows}
					getKey={getKey}
				/>
			</div>,
		)

		const grid = screen.getByRole('grid')

		const header = grid.querySelector<HTMLElement>('th[data-grid-col="role"]')

		if (!header) throw new Error('header cell not found')

		// Seat the cursor; the active cell appears with its scroll-margin applied.
		grid.focus()

		fireEvent.keyDown(grid, { key: 'ArrowDown' })

		await waitFor(() => expect(grid.querySelector('[data-active]')).not.toBeNull())

		const active = grid.querySelector('[data-active]') as HTMLElement

		// The top margin clears the sticky header's full height, so a scroll never
		// tucks the active cell beneath it.
		expect(getComputedStyle(header).position).toBe('sticky')

		expect(Number.parseFloat(active.style.scrollMarginTop)).toBeCloseTo(
			header.getBoundingClientRect().height,
			0,
		)
	})

	it('gives a cell behind a pinned column a matching side scroll-margin', async () => {
		renderUI(
			<div style={{ width: '320px' }}>
				<Grid
					navigable
					header={{ position: 'sticky' }}
					maxHeight="160px"
					columns={columns}
					rows={rows}
					getKey={getKey}
				/>
			</div>,
		)

		const grid = screen.getByRole('grid')

		const pinnedHeader = grid.querySelector<HTMLElement>('th[data-grid-col="name"]')

		if (!pinnedHeader) throw new Error('pinned header cell not found')

		grid.focus()

		// Move onto the non-pinned column so a horizontal scroll could tuck it
		// behind the left-pinned one.
		fireEvent.keyDown(grid, { key: 'ArrowDown' })

		fireEvent.keyDown(grid, { key: 'ArrowRight' })

		await waitFor(() => expect(grid.querySelector('[data-active]')).not.toBeNull())

		const active = grid.querySelector('[data-active]') as HTMLElement

		expect(Number.parseFloat(active.style.scrollMarginLeft)).toBeCloseTo(
			pinnedHeader.getBoundingClientRect().width,
			0,
		)
	})
})
