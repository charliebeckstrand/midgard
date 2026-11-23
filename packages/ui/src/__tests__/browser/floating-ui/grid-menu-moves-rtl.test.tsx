import { describe, expect, it, vi } from 'vitest'
import { Grid, type GridColumn } from '../../../modules/grid'
import { LocaleProvider } from '../../../providers/locale'
import { fireEvent, renderUI, screen, waitFor } from '../../helpers'

/**
 * The Move items of the column menu name the side on the screen. In a
 * right-to-left grid the next column is on the left, so "Move left" takes a
 * column to the next place, and the column moves left on the screen.
 */
describe('grid column menu moves (real browser)', () => {
	type Row = { id: number; name: string; role: string; team: string }

	const columns: GridColumn<Row>[] = [
		{ id: 'name', title: 'Name', cell: (row) => row.name },
		{ id: 'role', title: 'Role', cell: (row) => row.role },
		{ id: 'team', title: 'Team', cell: (row) => row.team },
	]

	const rows: Row[] = [{ id: 1, name: 'Alice', role: 'Developer', team: 'Core' }]

	const header = (name: string) => {
		const node = screen
			.getAllByRole('columnheader')
			.find((element) => element.textContent?.includes(name))

		if (!node) throw new Error(`no header "${name}"`)

		return node
	}

	it.each([
		['ltr', 'Move right'],
		['rtl', 'Move left'],
	] as const)('moves the first column away from the start under %s', async (dir, label) => {
		const onValueChange = vi.fn()

		renderUI(
			<LocaleProvider dir={dir}>
				<Grid
					reorder
					columns={columns}
					rows={rows}
					getKey={(row) => row.id}
					columnOrder={{ onValueChange }}
				/>
			</LocaleProvider>,
		)

		const before = header('Name').getBoundingClientRect().left

		fireEvent.contextMenu(header('Name'))

		fireEvent.click(await screen.findByRole('menuitem', { name: 'Move' }))

		fireEvent.click(await screen.findByRole('menuitem', { name: label }))

		expect(onValueChange).toHaveBeenLastCalledWith(['role', 'name', 'team'])

		// The column moves to the side that the label names.
		await waitFor(() => {
			const after = header('Name').getBoundingClientRect().left

			expect(dir === 'rtl' ? after < before : after > before).toBe(true)
		})
	})
})
