import { describe, expect, it } from 'vitest'
import { Grid, type GridColumn } from '../../../modules/grid'
import { fireEvent, renderUI, screen, waitFor } from '../../helpers'

/**
 * Pointer control of the grid context menu's submenus against the real floating
 * engine. The cursor and the travel triangle are both geometry — where the panel
 * landed, and whether the pointer is heading into it — so neither means anything
 * under the jsdom suite's mocked engine, which renders panels inline and reports
 * every rect as zero.
 *
 * @remarks One case, walked end to end: a second `it` would open its menu while
 * the first's panels were still unmounting, and every `role="menu"` query would
 * then match two.
 */
describe('grid context menu pointer travel (real browser)', () => {
	type Row = { id: number; name: string; role: string }

	const columns: GridColumn<Row>[] = [
		{ id: 'name', title: 'Name', cell: (row) => row.name },
		{ id: 'role', title: 'Role', cell: (row) => row.role },
	]

	const rows: Row[] = [{ id: 1, name: 'Alice', role: 'Developer' }]

	const item = (name: string) => screen.getByRole('menuitem', { name })

	/** The pointer settling on `row` at a client point. */
	const settle = (row: HTMLElement, x: number, y: number) =>
		fireEvent.pointerMove(row, { pointerType: 'mouse', clientX: x, clientY: y })

	/** A row's centre in client coordinates. */
	const centre = (el: HTMLElement) => {
		const rect = el.getBoundingClientRect()

		return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 }
	}

	it('holds the open panel while the pointer crosses a row heading into it', async () => {
		const { container } = renderUI(
			<div style={{ width: '700px' }}>
				<Grid resizable columns={columns} rows={rows} getKey={(row) => row.id} />
			</div>,
		)

		const header = container.querySelector<HTMLElement>('th[data-grid-col="name"]')

		if (!header) throw new Error('no Name header')

		fireEvent.contextMenu(header)

		await waitFor(() => expect(item('Sort')).toBeInTheDocument())

		const sort = item('Sort')

		const from = centre(sort)

		// Cursor and panel both land with the pointer, neither waiting on a clock.
		settle(sort, from.x, from.y)

		expect(sort).toHaveFocus()

		expect(item('Sort ascending')).toBeInTheDocument()

		// Positioned a frame later, once the engine has measured it.
		await waitFor(() => {
			const positioned = item('Sort ascending').getBoundingClientRect()

			expect(positioned.width).toBeGreaterThan(0)
		})

		const panel = item('Sort ascending').closest<HTMLElement>('[role="menu"]')

		if (!panel) throw new Error('no submenu panel')

		const rect = panel.getBoundingClientRect()

		const pin = item('Pin')

		// A point over the Pin row on the way to the panel's near edge: the sweep is
		// passing over it, not arriving at it.
		const edge = rect.left >= from.x ? rect.left : rect.right

		const crossing = { x: from.x + (edge - from.x) * 0.8, y: centre(pin).y }

		expect(crossing.y).toBeLessThan(rect.bottom)

		settle(pin, crossing.x, crossing.y)

		expect(item('Sort ascending')).toBeInTheDocument()

		expect(sort).toHaveFocus()

		// Straight down the menu instead, away from the panel: Pin takes the cursor
		// and its own submenu replaces the one open, both in the same frame.
		settle(pin, from.x, centre(pin).y)

		expect(pin).toHaveFocus()

		expect(item('Pin left')).toBeInTheDocument()

		expect(screen.queryByRole('menuitem', { name: 'Sort ascending' })).toBeNull()
	})
})
