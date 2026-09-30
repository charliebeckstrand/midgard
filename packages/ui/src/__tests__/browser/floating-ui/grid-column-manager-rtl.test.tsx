import { describe, expect, it } from 'vitest'
import { userEvent } from 'vitest/browser'
import { Grid, type GridColumn } from '../../../modules/grid'
import { fireEvent, present, renderUI, screen, waitFor } from '../../helpers'

/**
 * The column manager of a right-to-left grid, against the real floating
 * engine. The dialog portals to the body, outside the `dir` of the grid, so
 * the manager takes the direction of its grid through context. Its body lays
 * out right to left, and its pin menu names the physical edge of each target.
 */
describe('grid column manager in a right-to-left grid (real browser)', () => {
	type Row = { id: number; name: string; role: string }

	const columns: GridColumn<Row>[] = [
		{ id: 'name', title: 'Name', cell: (row) => row.name },
		{ id: 'role', title: 'Role', cell: (row) => row.role },
	]

	const rows: Row[] = [{ id: 1, name: 'Alice', role: 'Admin' }]

	it('lays out right to left and pins to the right edge from "Pin right"', async () => {
		const { container } = renderUI(
			<div dir="rtl" style={{ width: 500 }}>
				<Grid
					columns={columns}
					rows={rows}
					getKey={(row) => row.id}
					columnManager={{ toolbar: true }}
				/>
			</div>,
		)

		await userEvent.click(screen.getByRole('button', { name: /Manage columns|Columns/ }))

		const dialog = await screen.findByRole('dialog')

		const pinRole = present(
			dialog.querySelector<HTMLElement>('button[aria-label="Pin Role"]'),
			'the Role pin control',
		)

		expect(getComputedStyle(pinRole).direction).toBe('rtl')

		await userEvent.click(pinRole)

		const menu = await screen.findByRole('menu')

		expect(
			Array.from(menu.querySelectorAll('[role="menuitem"]')).map((item) =>
				item.textContent?.trim(),
			),
		).toEqual(['Pin right', 'Pin left'])

		await userEvent.click(screen.getByRole('menuitem', { name: 'Pin right' }))

		await waitFor(() =>
			expect(
				present(container.querySelector<HTMLElement>('th[data-grid-col="role"]'), 'the role header')
					.style.insetInlineStart,
			).toBe('0px'),
		)
	})

	it('lays out the row manager right to left', async () => {
		renderUI(
			<div dir="rtl" style={{ width: 500 }}>
				<Grid columns={columns} rows={rows} getKey={(row) => row.id} groupBy={{ value: 'role' }} />
			</div>,
		)

		await userEvent.click(screen.getByText('Admin (1)'), { button: 'right' })

		await userEvent.click(screen.getByRole('menuitem', { name: 'Manage rows' }))

		const dialog = await screen.findByRole('dialog')

		const color = present(
			dialog.querySelector<HTMLElement>('button[aria-label="Color for Admin"]'),
			'the Admin color control',
		)

		expect(getComputedStyle(color).direction).toBe('rtl')
	})

	it('lays out the width confirm right to left', async () => {
		renderUI(
			<div dir="rtl" style={{ width: 500 }}>
				<Grid
					columns={columns}
					rows={rows}
					getKey={(row) => row.id}
					preferences={{ columnSizing: { name: 240 } }}
				/>
			</div>,
		)

		// Events, not the pointer: a pointer path across the menu passes over the
		// Export parent, whose submenu can take the click. The layout is the subject.
		fireEvent.contextMenu(screen.getByRole('columnheader', { name: /Name/ }))

		fireEvent.click(screen.getByRole('menuitem', { name: 'Auto-size' }))

		fireEvent.click(await screen.findByRole('menuitem', { name: 'Auto-size all columns' }))

		const keep = await screen.findByRole('button', { name: 'Keep my widths' })

		expect(getComputedStyle(keep).direction).toBe('rtl')
	})
})
