import { describe, expect, it } from 'vitest'
import { userEvent } from 'vitest/browser'
import { Grid, type GridColumn } from '../../../modules/grid'
import { present, renderUI, screen, waitFor } from '../../helpers'

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
})
