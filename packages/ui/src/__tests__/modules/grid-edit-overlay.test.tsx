import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import {
	Grid,
	type GridCellChange,
	type GridCellRef,
	type GridCellRefusal,
	type GridColumn,
	type GridEditableConfig,
} from '../../modules/grid'
import {
	bySlot,
	present,
	renderUI,
	screen,
	setupUser,
	stubMatchMedia,
	waitFor,
	within,
} from '../helpers'

type Row = { id: number; name: string; count: number }

const rows: Row[] = [
	{ id: 1, name: 'Alice', count: 2 },
	{ id: 2, name: 'Bob', count: 5 },
]

const columns: GridColumn<Row>[] = [
	{ id: 'name', title: 'Name', field: 'name', cell: (row) => row.name },
	{ id: 'count', title: 'Count', field: 'count', cell: (row) => String(row.count) },
]

/**
 * A grid on a phone, with a button that opens row 1 as the pencil of a
 * consumer does. The phone is a stubbed media query: no hover and a narrow
 * viewport, as for the drawer of the DatePicker.
 */
function renderPhoneGrid(
	editable: Partial<GridEditableConfig> = {},
	gridColumns: GridColumn<Row>[] = columns,
) {
	stubMatchMedia((query) => query.startsWith('(hover: none)'))

	const user = setupUser()

	const onCommit = vi.fn<(changes: GridCellChange[]) => void>()

	function Harness() {
		const [editing, setEditing] = useState<Set<string | number>>(new Set())

		return (
			<>
				<button type="button" onClick={() => setEditing(new Set([1]))}>
					edit-1
				</button>
				<Grid
					columns={gridColumns}
					rows={rows}
					getKey={(row) => row.id}
					editable={{ rows: editing, onRowsChange: setEditing, onCommit, ...editable }}
				/>
			</>
		)
	}

	const view = renderUI(<Harness />)

	const editRow1 = () => user.click(screen.getByRole('button', { name: 'edit-1' }))

	return { ...view, user, onCommit, editRow1 }
}

describe('Grid editing on a phone', () => {
	it('opens the row in a drawer, and mounts no editor in the table', async () => {
		const { container, editRow1 } = renderPhoneGrid()

		await editRow1()

		const sheet = screen.getByRole('dialog', { name: 'Edit row 1' })

		expect(sheet).toHaveAttribute('data-slot', 'drawer')

		expect(within(sheet).getByRole('textbox', { name: 'Name' })).toHaveValue('Alice')

		expect(within(sheet).getByRole('spinbutton', { name: 'Count' })).toBeInTheDocument()

		expect(bySlot(present(container.querySelector('table'), 'table'), 'grid-edit-input')).toBeNull()
	})

	it('commits the staged values on Save and closes the sheet', async () => {
		const { user, onCommit, editRow1 } = renderPhoneGrid()

		await editRow1()

		const sheet = screen.getByRole('dialog')

		const name = within(sheet).getByRole('textbox', { name: 'Name' })

		await user.clear(name)

		await user.type(name, 'Ann')

		await user.click(within(sheet).getByRole('button', { name: 'Save' }))

		expect(onCommit).toHaveBeenCalledWith([
			expect.objectContaining({ rowKey: 1, columnId: 'name', value: 'Ann' }),
		])

		await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
	})

	it('discards the staged values on Cancel', async () => {
		const { user, onCommit, editRow1 } = renderPhoneGrid()

		await editRow1()

		const sheet = screen.getByRole('dialog')

		await user.type(within(sheet).getByRole('textbox', { name: 'Name' }), 'x')

		await user.click(within(sheet).getByRole('button', { name: 'Cancel' }))

		await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())

		expect(onCommit).not.toHaveBeenCalled()
	})

	it('blocks Save while a validate refuses a value, and shows why', async () => {
		const { user, onCommit, editRow1 } = renderPhoneGrid({}, [
			{
				...(columns[0] as GridColumn<Row>),
				validate: (value) => (String(value ?? '').trim() === '' ? 'Enter a name.' : null),
			},
			columns[1] as GridColumn<Row>,
		])

		await editRow1()

		const sheet = screen.getByRole('dialog')

		await user.clear(within(sheet).getByRole('textbox', { name: 'Name' }))

		await user.click(within(sheet).getByRole('button', { name: 'Save' }))

		expect(onCommit).not.toHaveBeenCalled()

		expect(within(sheet).getByText('Enter a name.')).toBeInTheDocument()

		expect(screen.getByRole('dialog')).toBeInTheDocument()
	})

	it('holds the drawer open while an async commit settles, and shows a refusal', async () => {
		let settle: (refused: GridCellRefusal[]) => void = () => {}

		const onCommit = vi.fn(
			() =>
				new Promise<GridCellRefusal[]>((resolve) => {
					settle = resolve
				}),
		)

		const { user, editRow1 } = renderPhoneGrid({ onCommit })

		await editRow1()

		const sheet = screen.getByRole('dialog')

		await user.type(within(sheet).getByRole('textbox', { name: 'Name' }), 'x')

		await user.click(within(sheet).getByRole('button', { name: /Save/ }))

		expect(onCommit).toHaveBeenCalled()

		expect(
			within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancel' }),
		).toBeDisabled()

		settle([{ rowKey: 1, columnId: 'name', error: 'Enter a different name.' }])

		await waitFor(() =>
			expect(
				within(screen.getByRole('dialog')).getByText('Enter a different name.'),
			).toBeInTheDocument(),
		)

		expect(within(screen.getByRole('dialog')).getByRole('textbox', { name: 'Name' })).toHaveValue(
			'Alicex',
		)
	})

	it('opens the row in a sheet with overlay sheet', async () => {
		const { editRow1 } = renderPhoneGrid({ overlay: 'sheet' })

		await editRow1()

		const sheet = screen.getByRole('dialog', { name: 'Edit row 1' })

		expect(sheet).toHaveAttribute('data-slot', 'sheet')

		expect(within(sheet).getByRole('button', { name: 'Save' })).toBeInTheDocument()
	})

	it('keeps the row out of edit in its actions until the drawer lands', async () => {
		// The motion mock lands no arrival, so the drawer never reports one.
		const { editRow1 } = renderPhoneGrid({}, [
			...columns,
			{
				id: 'actions',
				actions: (row, { editing }) => (editing ? `check-${row.id}` : `pencil-${row.id}`),
			},
		])

		await editRow1()

		expect(screen.getByRole('dialog')).toBeInTheDocument()

		expect(screen.getByText('pencil-1')).toBeInTheDocument()

		expect(screen.queryByText('check-1')).toBeNull()
	})

	it('focuses the grid with no scroll when a cell is pressed', async () => {
		const { user } = renderPhoneGrid()

		const focus = vi.spyOn(HTMLElement.prototype, 'focus')

		await user.click(screen.getByRole('gridcell', { name: 'Bob' }))

		expect(focus).toHaveBeenCalledWith({ preventScroll: true })

		expect(screen.getByRole('grid')).toHaveFocus()

		focus.mockRestore()
	})

	it('keeps the editors in the table with overlay false', async () => {
		const { container, editRow1 } = renderPhoneGrid({ overlay: false })

		await editRow1()

		expect(screen.queryByRole('dialog')).toBeNull()

		expect(bySlot(container, 'grid-edit-input')).toBeInTheDocument()
	})
})

describe('Grid editing on a phone, with a save that the consumer declines', () => {
	it('settles Save when a controlled rows keeps the row open', async () => {
		// Opens rows, and never closes one.
		const { user, editRow1, onCommit } = renderPhoneGrid({
			onRowsChange: () => {},
		})

		await editRow1()

		const sheet = screen.getByRole('dialog')

		await user.type(within(sheet).getByRole('textbox', { name: 'Name' }), 'x')

		await user.click(within(sheet).getByRole('button', { name: /Save/ }))

		const open = screen.getByRole('dialog')

		expect(within(open).getByRole('button', { name: 'Cancel' })).toBeEnabled()

		expect(within(open).getByRole('textbox', { name: 'Name' })).toHaveValue('Alicex')

		expect(onCommit).not.toHaveBeenCalled()
	})

	/** A cell-scoped grid on a phone whose `cell` the harness controls. */
	function renderCellGrid(accept: (next: GridCellRef | null) => boolean) {
		stubMatchMedia((query) => query.startsWith('(hover: none)'))

		const user = setupUser()

		function Harness() {
			const [cell, setCell] = useState<GridCellRef | null>(null)

			return (
				<>
					<button type="button" onClick={() => setCell({ rowKey: 1, columnId: 'name' })}>
						edit-1
					</button>
					<Grid
						columns={columns}
						rows={rows}
						getKey={(row) => row.id}
						editable={{
							session: 'managed',
							scope: 'cell',
							cell,
							onCellChange: (next) => {
								if (accept(next)) setCell(next)
							},
							onCommit: vi.fn(),
						}}
					/>
				</>
			)
		}

		renderUI(<Harness />)

		return { user, editRow1: () => user.click(screen.getByRole('button', { name: 'edit-1' })) }
	}

	it('settles Save when a controlled cell keeps the session', async () => {
		const { user, editRow1 } = renderCellGrid((next) => next !== null)

		await editRow1()

		await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: /Save/ }))

		expect(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancel' })).toBeEnabled()
	})

	it('closes the overlay when a controlled cell ends the session', async () => {
		const { user, editRow1 } = renderCellGrid(() => true)

		await editRow1()

		await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: /Save/ }))

		await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
	})
})
