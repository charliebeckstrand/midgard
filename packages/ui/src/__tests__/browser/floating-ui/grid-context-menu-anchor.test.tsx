import { describe, expect, it } from 'vitest'
import { Grid, type GridColumn } from '../../../modules/grid'
import { fireEvent, renderUI, screen, waitFor } from '../../helpers'

/**
 * Grid context-menu anchoring against the real floating engine and real layout.
 * The jsdom suite mocks `@floating-ui/react` and has no geometry, so the menu's
 * scroll-following only surfaces here. The menu opens at the cursor but anchors
 * to the right-clicked element (its `useClientPoint` reference), so it tracks
 * that element as the surrounding container scrolls instead of staying pinned to
 * the original viewport coordinate.
 */
describe('grid context menu anchoring (real browser)', () => {
	type Row = { id: number; name: string }

	const columns: GridColumn<Row>[] = [
		{ id: 'name', title: 'Name', cell: (row) => row.name, value: (row) => row.name },
	]

	// Enough rows to overflow a short scroll container so the body scrolls under
	// an open menu; no virtualization, so the right-clicked cell stays mounted.
	const rows: Row[] = Array.from({ length: 40 }, (_, i) => ({ id: i, name: `Person ${i}` }))

	const getKey = (row: Row) => row.id

	it('follows the right-clicked cell as the surrounding container scrolls', async () => {
		const { container } = renderUI(
			// Pushed down the page so the menu opens mid-viewport, clear of the
			// shift() collision padding at the edges.
			<div style={{ marginTop: 240, maxHeight: 160, overflow: 'auto' }}>
				<Grid columns={columns} rows={rows} getKey={getKey} />
			</div>,
		)

		const scroller = container.firstElementChild as HTMLElement

		const cell = screen.getByText('Person 2')

		const opened = cell.getBoundingClientRect()

		fireEvent.contextMenu(cell, { clientX: opened.left + 4, clientY: opened.top + 4 })

		const menu = await screen.findByRole('menu')

		// The cell and the menu at open time, before any scroll.
		const cellTop0 = cell.getBoundingClientRect().top
		const menuTop0 = menu.getBoundingClientRect().top

		// Scroll the container; the cell moves up in the viewport.
		scroller.scrollTop = 40

		await waitFor(() => {
			const cellTop1 = cell.getBoundingClientRect().top
			const menuTop1 = menu.getBoundingClientRect().top

			// The cell actually scrolled up.
			expect(cellTop0 - cellTop1).toBeGreaterThan(20)

			// The menu moved with it (not pinned to the original viewport point).
			expect(menuTop0 - menuTop1).toBeGreaterThan(20)

			// Its offset from the cell held: the menu tracked the cell one-to-one.
			expect(Math.abs(menuTop1 - cellTop1 - (menuTop0 - cellTop0))).toBeLessThan(2)
		})
	})

	it('stays put when the open menu itself is right-clicked', async () => {
		renderUI(
			<div style={{ marginTop: 240 }}>
				<Grid columns={columns} rows={rows} getKey={getKey} />
			</div>,
		)

		const cell = screen.getByText('Person 2')

		const opened = cell.getBoundingClientRect()

		fireEvent.contextMenu(cell, { clientX: opened.left + 4, clientY: opened.top + 4 })

		const menu = await screen.findByRole('menu')

		const before = menu.getBoundingClientRect()

		// Right-click a menu item — the panel is portaled out but its contextmenu
		// still bubbles to the wrapper. Re-anchoring to an item inside the panel
		// would make it chase its own rect; the position must instead hold.
		const item = screen.getByRole('menuitem', { name: 'Copy' })

		const itemRect = item.getBoundingClientRect()

		fireEvent.contextMenu(item, { clientX: itemRect.left + 4, clientY: itemRect.top + 4 })

		// Let any stray autoUpdate ticks settle, then confirm the panel did not move.
		await new Promise((resolve) => setTimeout(resolve, 100))

		const after = menu.getBoundingClientRect()

		expect(after.top).toBeCloseTo(before.top, 1)

		expect(after.left).toBeCloseTo(before.left, 1)
	})
})
