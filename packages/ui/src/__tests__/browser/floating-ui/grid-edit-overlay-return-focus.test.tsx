import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import { userEvent } from 'vitest/browser'
import { Grid, type GridColumn } from '../../../modules/grid'
import { present, renderUI, screen, stubMatchMedia, waitFor, within } from '../../helpers'

type Row = { id: number; name: string }

const rows: Row[] = [
	{ id: 1, name: 'Alice' },
	{ id: 2, name: 'Bob' },
]

function PhoneGrid() {
	const [editing, setEditing] = useState<Set<string | number>>(new Set())

	const columns: GridColumn<Row>[] = [
		{ id: 'name', title: 'Name', field: 'name', cell: (row) => row.name },
		{
			id: 'actions',
			actions: (row) => (
				<button type="button" onClick={() => setEditing(new Set([row.id]))}>
					{`edit-${row.id}`}
				</button>
			),
		},
	]

	return (
		<Grid
			columns={columns}
			rows={rows}
			getKey={(row) => row.id}
			editable={{
				rows: editing,
				onRowsChange: setEditing,
				session: 'managed',
				onCommit: () => {},
			}}
		/>
	)
}

function grids() {
	const [first, second] = screen.getAllByRole('grid')

	return [present(first, 'first grid'), present(second, 'second grid')] as const
}

function cancel() {
	return userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancel' }))
}

/**
 * On a phone a row edits in a drawer. When the drawer closes, the focus goes back
 * to the cell that was edited, or to the control that opened the row. It never
 * goes to an element that had the focus before, such as a cell of another grid.
 * A focus there scrolls the page to that grid.
 *
 * The real focus manager is necessary: the jsdom mock returns no focus.
 */
describe('grid edit overlay return focus (real floating engine)', () => {
	it('returns the focus to the pencil, not to a grid that had the focus before', async () => {
		stubMatchMedia((query) => query.startsWith('(hover: none)'))

		renderUI(
			<>
				<PhoneGrid />
				<PhoneGrid />
			</>,
		)

		const [first, second] = grids()

		await userEvent.click(within(second).getByRole('gridcell', { name: 'Alice' }))

		await waitFor(() => expect(second).toHaveFocus())

		const pencil = within(first).getByRole('button', { name: 'edit-2' })

		await userEvent.click(pencil)

		await screen.findByRole('dialog', { name: 'Edit row 2' })

		await cancel()

		await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())

		await waitFor(() => expect(pencil).toHaveFocus())
	})

	// Safari does not focus a button on a tap, so the table keeps the focus of
	// the earlier press while the pencil opens its row.
	it('returns the focus to the pencil when the press did not focus it', async () => {
		stubMatchMedia((query) => query.startsWith('(hover: none)'))

		renderUI(
			<>
				<PhoneGrid />
				<PhoneGrid />
			</>,
		)

		const [first] = grids()

		await userEvent.click(within(first).getByRole('gridcell', { name: 'Alice' }))

		await waitFor(() => expect(first).toHaveFocus())

		const pencil = within(first).getByRole('button', { name: 'edit-2' })

		const keepFocus = (event: MouseEvent) => event.preventDefault()

		pencil.addEventListener('mousedown', keepFocus)

		await userEvent.click(pencil)

		pencil.removeEventListener('mousedown', keepFocus)

		await screen.findByRole('dialog', { name: 'Edit row 2' })

		await cancel()

		await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())

		await waitFor(() => expect(pencil).toHaveFocus())
	})

	it('returns the focus to the edited cell after a double click', async () => {
		stubMatchMedia((query) => query.startsWith('(hover: none)'))

		renderUI(
			<>
				<PhoneGrid />
				<PhoneGrid />
			</>,
		)

		const [first, second] = grids()

		await userEvent.click(within(first).getByRole('gridcell', { name: 'Alice' }))

		await userEvent.dblClick(within(second).getByRole('gridcell', { name: 'Bob' }))

		await screen.findByRole('dialog', { name: 'Edit row 2' })

		await cancel()

		await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())

		await waitFor(() => expect(second).toHaveFocus())

		expect(within(second).getByRole('gridcell', { name: 'Bob' })).toHaveAttribute('data-active')
	})
})
