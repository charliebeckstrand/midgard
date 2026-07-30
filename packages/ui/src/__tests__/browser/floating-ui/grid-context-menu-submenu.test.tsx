import { describe, expect, it } from 'vitest'
import { Grid, type GridColumn } from '../../../modules/grid'
import { fireEvent, renderUI, screen, waitFor } from '../../helpers'

/**
 * Keyboard control of the grid context menu's submenus against the real
 * floating engine: ArrowRight opens the roved parent onto its first row,
 * ArrowLeft returns, roving on collapses what was left open, `Escape` closes
 * the submenu alone, and Tab is held inside the menu. Each hangs on real focus
 * crossing a portal boundary, which
 * the jsdom suite can't reproduce — it mocks `@floating-ui/react`, so the panels
 * render inline there and no crossing happens.
 *
 * @remarks One case, walked end to end: a second `it` would open its menu while
 * the first's panels were still unmounting, and every `role="menu"` query would
 * then match two.
 */
describe('grid context menu submenus (real browser)', () => {
	type Row = { id: number; name: string; role: string }

	const columns: GridColumn<Row>[] = [
		{ id: 'name', title: 'Name', cell: (row) => row.name },
		{ id: 'role', title: 'Role', cell: (row) => row.role },
	]

	const rows: Row[] = [{ id: 1, name: 'Alice', role: 'Developer' }]

	const item = (name: string) => screen.getByRole('menuitem', { name })

	const gone = (name: string) =>
		waitFor(() => expect(screen.queryByRole('menuitem', { name })).toBeNull())

	it('opens, returns, collapses on rove-away and Escape, and holds Tab', async () => {
		const { container } = renderUI(
			<>
				<button type="button">before</button>

				<div style={{ width: '700px' }}>
					<Grid resizable columns={columns} rows={rows} getKey={(row) => row.id} />
				</div>

				<button type="button">after</button>
			</>,
		)

		const header = container.querySelector<HTMLElement>('th[data-grid-col="name"]')

		if (!header) throw new Error('no Name header')

		fireEvent.contextMenu(header)

		await waitFor(() => expect(item('Sort')).toBeInTheDocument())

		const menu = screen.getByRole('menu')

		// Seat focus outright rather than racing the panel's own open-time
		// autofocus, which `grid-context-menu-keyboard` already covers.
		menu.focus()

		fireEvent.keyDown(menu, { key: 'ArrowDown' })

		expect(item('Sort')).toHaveFocus()

		// ArrowRight opens the roved parent onto its first row.
		fireEvent.keyDown(item('Sort'), { key: 'ArrowRight' })

		await waitFor(() => expect(item('Sort ascending')).toHaveFocus())

		// ArrowLeft collapses it and hands the cursor back to the parent row.
		fireEvent.keyDown(item('Sort ascending'), { key: 'ArrowLeft' })

		await gone('Sort ascending')

		expect(item('Sort')).toHaveFocus()

		// Re-opened, then roved away from: the submenu closes behind the cursor.
		fireEvent.keyDown(item('Sort'), { key: 'ArrowRight' })

		await waitFor(() => expect(item('Sort ascending')).toHaveFocus())

		fireEvent.keyDown(item('Sort ascending'), { key: 'ArrowLeft' })

		fireEvent.keyDown(item('Sort'), { key: 'ArrowDown' })

		expect(item('Pin')).toHaveFocus()

		await gone('Sort ascending')

		// Escape collapses an open submenu and stops there — the menu it hangs off
		// takes the next press, not this one.
		fireEvent.keyDown(item('Pin'), { key: 'ArrowRight' })

		await waitFor(() => expect(item('Pin left')).toHaveFocus())

		fireEvent.keyDown(item('Pin left'), { key: 'Escape' })

		await gone('Pin left')

		expect(menu).toBeInTheDocument()

		expect(item('Pin')).toHaveFocus()

		// More Tab presses than the menu has rows, so a leak would carry focus past
		// the last one and out to the page's own buttons.
		for (let press = 0; press < 10; press++) {
			fireEvent.keyDown(document.activeElement as HTMLElement, { key: 'Tab' })

			expect(menu.contains(document.activeElement)).toBe(true)
		}
	})
})
