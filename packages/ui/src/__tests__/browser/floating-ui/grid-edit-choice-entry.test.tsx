import { describe, expect, it, vi } from 'vitest'
import { userEvent } from 'vitest/browser'
import { Listbox, ListboxLabel, ListboxOption } from '../../../components/listbox'
import { Grid, type GridColumn } from '../../../modules/grid'
import { bySlot, present, renderUI, screen, waitFor } from '../../helpers'

/**
 * A choice editor opens its panel on entry, on the real floating engine, so
 * the user does not press again to see the choices. An entry is Enter, F2, a
 * double-click, or Tab from the cell before. The other editors of a row that
 * row scope opens stay closed. An `editCell` slot reads the entry from
 * `entered`. A pick commits the cell that a cell-scoped session holds, as in
 * a spreadsheet, and only stages under row scope.
 */
describe('grid choice editor on entry (real floating engine)', () => {
	type Row = { id: number; name: string; done: boolean }

	const rows: Row[] = [
		{ id: 1, name: 'Alice', done: false },
		{ id: 2, name: 'Bruno', done: true },
	]

	const columns: GridColumn<Row>[] = [
		{ id: 'name', title: 'Name', field: 'name', cell: (row) => row.name },
		{ id: 'done', title: 'Done', field: 'done', cell: (row) => (row.done ? 'Yes' : 'No') },
	]

	const getCell = (container: HTMLElement, column: string, row = 0) =>
		present<HTMLElement>(
			container.querySelectorAll(`td[data-grid-col="${column}"]`)[row],
			`td[data-grid-col="${column}"]`,
		)

	const panel = () => screen.queryByRole('listbox')

	it('opens the yes/no panel on a double-click, with focus in the panel', async () => {
		const onCommit = vi.fn()

		const { container } = renderUI(
			<Grid
				columns={columns}
				rows={rows}
				getKey={(row) => row.id}
				editable={{ session: 'managed', scope: 'cell', onCommit }}
			/>,
		)

		await userEvent.dblClick(getCell(container, 'done'))

		const list = await screen.findByRole('listbox')

		await waitFor(() => expect(list.contains(document.activeElement)).toBe(true))

		// The panel opens below the cell, where the settle pair floats, so the
		// pair hides while the panel is open.
		expect(screen.queryByRole('button', { name: 'Save Done, row 2' })).toBeNull()

		// A pick commits the cell, as in a spreadsheet. The editor closes, the
		// cursor stays on the cell, and focus goes back to the grid.
		await userEvent.click(screen.getByRole('option', { name: 'Yes' }))

		await waitFor(() => expect(bySlot(container, 'grid-edit-boolean-input')).toBeNull())

		expect(panel()).toBeNull()

		expect(onCommit).toHaveBeenCalledExactlyOnceWith([{ rowKey: 1, columnId: 'done', value: true }])

		const grid = screen.getByRole('grid')

		await waitFor(() => expect(grid).toHaveFocus())

		expect(grid).toHaveAttribute('aria-activedescendant', getCell(container, 'done').id)
	})

	it('commits a pick made with the keyboard', async () => {
		const onCommit = vi.fn()

		const { container } = renderUI(
			<Grid
				columns={columns}
				rows={rows}
				getKey={(row) => row.id}
				editable={{ session: 'managed', scope: 'cell', onCommit }}
			/>,
		)

		await userEvent.click(getCell(container, 'done'))

		await userEvent.keyboard('{Enter}')

		await screen.findByRole('listbox')

		await userEvent.keyboard('{ArrowUp}{Enter}')

		await waitFor(() => expect(bySlot(container, 'grid-edit-boolean-input')).toBeNull())

		expect(onCommit).toHaveBeenCalledExactlyOnceWith([{ rowKey: 1, columnId: 'done', value: true }])

		await waitFor(() => expect(screen.getByRole('grid')).toHaveFocus())
	})

	it('commits a pick that Tab makes once, and Tab moves on along the row', async () => {
		const onCommit = vi.fn()

		const { container } = renderUI(
			<Grid
				columns={columns}
				rows={rows}
				getKey={(row) => row.id}
				editable={{ session: 'managed', scope: 'cell', onCommit }}
			/>,
		)

		await userEvent.dblClick(getCell(container, 'done'))

		await screen.findByRole('listbox')

		// Tab picks the active option, commits the cell, and moves the session
		// along the row, which wraps to the name cell.
		await userEvent.keyboard('{ArrowUp}{Tab}')

		await waitFor(() =>
			expect(getCell(container, 'name').contains(document.activeElement)).toBe(true),
		)

		expect(bySlot(container, 'grid-edit-input')).not.toBeNull()

		expect(onCommit).toHaveBeenCalledExactlyOnceWith([{ rowKey: 1, columnId: 'done', value: true }])
	})

	it('only stages a pick under row scope, where the row commits as one', async () => {
		const onCommit = vi.fn()

		const { container } = renderUI(
			<Grid
				columns={columns}
				rows={rows}
				getKey={(row) => row.id}
				editable={{ session: 'managed', onCommit }}
			/>,
		)

		await userEvent.dblClick(getCell(container, 'done'))

		await userEvent.click(await screen.findByRole('option', { name: 'Yes' }))

		await waitFor(() => expect(panel()).toBeNull())

		// The row stays open, with the pick staged, and focus back on the trigger.
		await waitFor(() => expect(screen.getByRole('combobox')).toHaveFocus())

		expect(bySlot(container, 'grid-edit-input')).not.toBeNull()

		expect(onCommit).not.toHaveBeenCalled()

		await userEvent.keyboard('{F2}')

		expect(onCommit).toHaveBeenCalledExactlyOnceWith([{ rowKey: 1, columnId: 'done', value: true }])
	})

	it('opens the panel on Enter and on F2 from the cursor', async () => {
		const { container } = renderUI(
			<Grid
				columns={columns}
				rows={rows}
				getKey={(row) => row.id}
				editable={{ session: 'managed', scope: 'cell', onCommit: () => {} }}
			/>,
		)

		await userEvent.click(getCell(container, 'done'))

		await userEvent.keyboard('{Enter}')

		await screen.findByRole('listbox')

		// The first Escape closes the panel, and the second ends the session.
		await userEvent.keyboard('{Escape}')

		await waitFor(() => expect(panel()).toBeNull())

		expect(bySlot(container, 'grid-edit-boolean-input')).not.toBeNull()

		await userEvent.keyboard('{Escape}')

		await waitFor(() => expect(bySlot(container, 'grid-edit-boolean-input')).toBeNull())

		await userEvent.keyboard('{F2}')

		await screen.findByRole('listbox')
	})

	it('opens the panel as Tab moves the session onto the cell, and Tab moves on', async () => {
		const onCommit = vi.fn()

		const { container } = renderUI(
			<Grid
				columns={columns}
				rows={rows}
				getKey={(row) => row.id}
				editable={{ session: 'managed', scope: 'cell', onCommit }}
			/>,
		)

		await userEvent.dblClick(getCell(container, 'name'))

		await waitFor(() =>
			expect(getCell(container, 'name').contains(document.activeElement)).toBe(true),
		)

		expect(panel()).toBeNull()

		await userEvent.keyboard('{Tab}')

		await screen.findByRole('listbox')

		// Tab in the panel keeps the value, closes the panel, and moves the session
		// on along the row, which wraps to the name cell.
		await userEvent.keyboard('{Tab}')

		await waitFor(() => expect(panel()).toBeNull())

		await waitFor(() =>
			expect(getCell(container, 'name').contains(document.activeElement)).toBe(true),
		)

		expect(bySlot(container, 'grid-edit-boolean-input')).toBeNull()
	})

	it('keeps the other editors of a row-scoped row closed', async () => {
		const { container } = renderUI(
			<Grid
				columns={columns}
				rows={rows}
				getKey={(row) => row.id}
				editable={{ session: 'managed', onCommit: () => {} }}
			/>,
		)

		// The entry names the name cell, so the yes/no editor of the row mounts
		// closed.
		await userEvent.dblClick(getCell(container, 'name'))

		await waitFor(() =>
			expect(getCell(container, 'name').contains(document.activeElement)).toBe(true),
		)

		expect(bySlot(container, 'grid-edit-boolean-input')).not.toBeNull()

		expect(panel()).toBeNull()
	})

	it('opens the panel of a row-scoped row at the cell that the entry names', async () => {
		const { container } = renderUI(
			<Grid
				columns={columns}
				rows={rows}
				getKey={(row) => row.id}
				editable={{ session: 'managed', onCommit: () => {} }}
			/>,
		)

		await userEvent.dblClick(getCell(container, 'done', 1))

		await screen.findByRole('listbox')

		expect(container.querySelectorAll('[data-slot="grid-edit-boolean-input"]')).toHaveLength(1)
	})

	it('tells an editCell slot which editor the entry mounted', async () => {
		const seen = new Map<string, boolean>()

		const slotColumns: GridColumn<Row>[] = [
			{
				...columns[0],
				id: 'name',
				editCell: (context) => {
					seen.set('name', context.entered)

					return <input aria-label={context.ariaLabel} defaultValue={String(context.value)} />
				},
			} as GridColumn<Row>,
			{
				id: 'status',
				title: 'Status',
				field: 'done',
				cell: (row) => (row.done ? 'Done' : 'Open'),
				editCell: (context) => {
					seen.set('status', context.entered)

					return (
						<Listbox<string>
							aria-label={context.ariaLabel}
							defaultOpen={context.entered}
							value={context.value ? 'done' : 'open'}
							onValueChange={(next) => context.onValueUpdate(next === 'done')}
						>
							<ListboxOption value="open">
								<ListboxLabel>Open</ListboxLabel>
							</ListboxOption>
							<ListboxOption value="done">
								<ListboxLabel>Done</ListboxLabel>
							</ListboxOption>
						</Listbox>
					)
				},
			},
		]

		const { container } = renderUI(
			<Grid
				columns={slotColumns}
				rows={rows}
				getKey={(row) => row.id}
				editable={{ session: 'managed', onCommit: () => {} }}
			/>,
		)

		await userEvent.dblClick(getCell(container, 'status'))

		await screen.findByRole('option', { name: 'Done' })

		expect(seen.get('status')).toBe(true)

		expect(seen.get('name')).toBe(false)
	})

	describe('an editCell slot that commits its pick', () => {
		const slotColumns: GridColumn<Row>[] = [
			columns[0] as GridColumn<Row>,
			{
				id: 'status',
				title: 'Status',
				field: 'done',
				cell: (row) => (row.done ? 'Done' : 'Open'),
				editCell: (context) => (
					<Listbox<string>
						aria-label={context.ariaLabel}
						defaultOpen={context.entered}
						value={context.value ? 'done' : 'open'}
						onValueChange={(next) => context.commit(next === 'done')}
					>
						<ListboxOption value="open">
							<ListboxLabel>Open</ListboxLabel>
						</ListboxOption>
						<ListboxOption value="done">
							<ListboxLabel>Done</ListboxLabel>
						</ListboxOption>
					</Listbox>
				),
			},
		]

		it('commits the cell under cell scope', async () => {
			const onCommit = vi.fn()

			const { container } = renderUI(
				<Grid
					columns={slotColumns}
					rows={rows}
					getKey={(row) => row.id}
					editable={{ session: 'managed', scope: 'cell', onCommit }}
				/>,
			)

			await userEvent.dblClick(getCell(container, 'status'))

			await userEvent.click(await screen.findByRole('option', { name: 'Done' }))

			await waitFor(() => expect(screen.queryByRole('combobox')).toBeNull())

			expect(onCommit).toHaveBeenCalledExactlyOnceWith([
				{ rowKey: 1, columnId: 'status', value: true },
			])
		})

		it('only stages under row scope', async () => {
			const onCommit = vi.fn()

			const { container } = renderUI(
				<Grid
					columns={slotColumns}
					rows={rows}
					getKey={(row) => row.id}
					editable={{ session: 'managed', onCommit }}
				/>,
			)

			await userEvent.dblClick(getCell(container, 'status'))

			await userEvent.click(await screen.findByRole('option', { name: 'Done' }))

			await waitFor(() => expect(panel()).toBeNull())

			expect(screen.getByRole('combobox')).toBeInTheDocument()

			expect(bySlot(container, 'grid-edit-input')).not.toBeNull()

			expect(onCommit).not.toHaveBeenCalled()
		})
	})
})
