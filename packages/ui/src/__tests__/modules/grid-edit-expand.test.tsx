import { describe, expect, it, vi } from 'vitest'
import {
	Grid,
	type GridCellChange,
	type GridCellRefusal,
	type GridColumn,
	type GridEditableConfig,
} from '../../modules/grid'
import {
	bySlot,
	deferred,
	fireEvent,
	present,
	renderUI,
	screen,
	setupUser,
	stubMatchMedia,
	waitFor,
	within,
} from '../helpers'

type Row = { id: number; name: string; count: number; note: string }

const rows: Row[] = [
	{ id: 1, name: 'Alice', count: 2, note: 'First' },
	{ id: 2, name: 'Bob', count: 5, note: 'Second' },
]

const dataColumns: GridColumn<Row>[] = [
	{ id: 'name', title: 'Name', field: 'name', cell: (row) => row.name },
	{ id: 'count', title: 'Count', field: 'count', cell: (row) => String(row.count) },
	{ id: 'note', title: 'Note', field: 'note', cell: (row) => row.note },
]

/** The data columns and an actions column with an expand button on each row. */
const columns: GridColumn<Row>[] = [
	...dataColumns,
	{
		id: 'actions',
		actions: (row, { expand }) => (
			<button type="button" onClick={expand}>
				{`expand-${row.id}`}
			</button>
		),
	},
]

/** A grid on a wide screen, with an expand button on each row. */
function renderGrid(editable: Partial<GridEditableConfig> = {}) {
	const user = setupUser()

	const onCommit = vi.fn<(changes: GridCellChange[]) => void>()

	const view = renderUI(
		<Grid
			columns={columns}
			rows={rows}
			getKey={(row) => row.id}
			editable={{ session: 'managed', onCommit, ...editable }}
		/>,
	)

	const expand = (id: number) => user.click(screen.getByRole('button', { name: `expand-${id}` }))

	const table = present(view.container.querySelector('table'), 'table')

	return { ...view, user, onCommit, expand, table }
}

const form = () => screen.getByRole('dialog', { name: /Edit/ })

describe('Grid row form (expand)', () => {
	it('opens the row in a side sheet on a wide screen, with no editor in the table', async () => {
		const { expand, table } = renderGrid()

		await expand(1)

		const sheet = form()

		expect(sheet).toHaveAttribute('data-slot', 'sheet')

		expect(within(sheet).getByRole('textbox', { name: 'Name' })).toHaveValue('Alice')

		expect(within(sheet).getByRole('spinbutton', { name: 'Count' })).toBeInTheDocument()

		expect(within(sheet).getByRole('textbox', { name: 'Note' })).toHaveValue('First')

		expect(bySlot(table, 'grid-edit-input')).toBeNull()
	})

	it('commits the changed fields as one batch on Save', async () => {
		const { user, onCommit, expand } = renderGrid({ scope: 'cell' })

		await expand(1)

		const name = within(form()).getByRole('textbox', { name: 'Name' })

		await user.clear(name)

		await user.type(name, 'Ann')

		const note = within(form()).getByRole('textbox', { name: 'Note' })

		await user.clear(note)

		await user.type(note, 'Lead')

		await user.click(within(form()).getByRole('button', { name: 'Save' }))

		expect(onCommit).toHaveBeenCalledExactlyOnceWith([
			expect.objectContaining({ rowKey: 1, columnId: 'name', value: 'Ann' }),
			expect.objectContaining({ rowKey: 1, columnId: 'note', value: 'Lead' }),
		])

		await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
	})

	it('drops each changed field on Cancel, under cell scope too', async () => {
		const { user, onCommit, expand, table } = renderGrid({ scope: 'cell' })

		await expand(2)

		await user.type(within(form()).getByRole('textbox', { name: 'Name' }), 'x')

		await user.type(within(form()).getByRole('textbox', { name: 'Note' }), 'y')

		await user.click(within(form()).getByRole('button', { name: 'Cancel' }))

		await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())

		expect(onCommit).not.toHaveBeenCalled()

		expect(within(table).getByRole('gridcell', { name: 'Bob' })).toBeInTheDocument()
	})

	it('commits the cell that a cell-scoped session holds on another row first', async () => {
		const { user, onCommit, expand, table } = renderGrid({ scope: 'cell' })

		fireEvent.doubleClick(within(table).getByRole('gridcell', { name: 'Alice' }))

		const input = await waitFor(() =>
			present<HTMLInputElement>(bySlot(table, 'grid-edit-input'), 'the edit input'),
		)

		await user.type(input, 'a')

		await expand(2)

		expect(onCommit).toHaveBeenCalledWith([
			expect.objectContaining({ rowKey: 1, columnId: 'name', value: 'Alicea' }),
		])

		expect(within(form()).getByRole('textbox', { name: 'Name' })).toHaveValue('Bob')
	})

	it('keeps the session as focus moves into the form under a commit on leave', async () => {
		const { user, onCommit, expand } = renderGrid({ commitOn: 'leaveGrid' })

		await expand(1)

		const name = within(form()).getByRole('textbox', { name: 'Name' })

		name.focus()

		await user.type(name, 'z')

		expect(onCommit).not.toHaveBeenCalled()

		expect(form()).toBeInTheDocument()
	})

	it('opens the form of the cursor row on Shift+Enter, at the field of the cursor column', async () => {
		const { user, table } = renderGrid()

		await user.click(within(table).getByRole('gridcell', { name: 'Second' }))

		await user.keyboard('{Shift>}{Enter}{/Shift}')

		const note = within(form()).getByRole('textbox', { name: 'Note' })

		expect(note).toHaveValue('Second')

		await waitFor(() => expect(note).toHaveFocus())
	})

	it.each(['row', 'cell'] as const)(
		'opens the form again with the error of an async refusal under %s scope',
		async (scope) => {
			const commit = deferred<GridCellRefusal[]>()

			const onCommit = vi.fn(() => commit.promise)

			const { user, expand } = renderGrid({ scope, onCommit })

			await expand(1)

			await user.type(within(form()).getByRole('textbox', { name: 'Name' }), 'x')

			await user.click(within(form()).getByRole('button', { name: /Save/ }))

			expect(onCommit).toHaveBeenCalled()

			commit.resolve([{ rowKey: 1, columnId: 'name', error: 'Enter a different name.' }])

			await waitFor(() =>
				expect(within(form()).getByText('Enter a different name.')).toBeInTheDocument(),
			)

			expect(within(form()).getByRole('textbox', { name: 'Name' })).toHaveValue('Alicex')
		},
	)

	it('shows the whole row in the drawer of a phone, under cell scope', async () => {
		stubMatchMedia((query) => query.startsWith('(hover: none)'))

		const { expand } = renderGrid({ scope: 'cell' })

		await expand(1)

		expect(form()).toHaveAttribute('data-slot', 'drawer')

		expect(within(form()).getByRole('textbox', { name: 'Note' })).toBeInTheDocument()
	})

	it('opens no form for a row with no editable column', async () => {
		const user = setupUser()

		renderUI(
			<Grid
				columns={[
					{ id: 'name', title: 'Name', cell: (row: Row) => row.name },
					{
						id: 'actions',
						actions: (row: Row, { expand }) => (
							<button type="button" onClick={expand}>{`expand-${row.id}`}</button>
						),
					},
				]}
				rows={rows}
				getKey={(row) => row.id}
				editable={{ session: 'managed', onCommit: () => {} }}
			/>,
		)

		await user.click(screen.getByRole('button', { name: 'expand-1' }))

		expect(screen.queryByRole('dialog')).toBeNull()
	})
})
