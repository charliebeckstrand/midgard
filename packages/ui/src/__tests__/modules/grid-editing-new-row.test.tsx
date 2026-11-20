import { describe, expect, it, vi } from 'vitest'
import {
	Grid,
	type GridCellRefusal,
	type GridColumn,
	type GridEditableConfig,
	type GridNewRowAddContext,
	type GridProps,
} from '../../modules/grid'
import {
	NEW_ROW_ADD_COLUMN_ID as ADD_COLUMN,
	NEW_ROW_ADD_COLUMN_SIZE,
	resolveNewRowAddWidth,
} from '../../modules/grid/engine/grid-new-row-column'
import {
	act,
	bySlot,
	deferred,
	expectAnnouncement,
	fireEvent,
	getSlot,
	liveRegion,
	present,
	renderUI,
	setupUser,
} from '../helpers'
import { editorsIn, type SessionRow, sessionColumns, sessionRows } from '../helpers/grid-session'

/**
 * The new-row slot (`editable.newRow`): one blank editor row pinned at the top
 * or the bottom of the body, outside the row model. An explicit add calls
 * `onRowAdd` with the drafted values; leaving the row never adds it.
 */
describe('Grid new row', () => {
	const moveFocus = (element: HTMLElement) => act(() => element.focus())

	function renderNewRow(
		editable: Partial<GridEditableConfig> = {},
		props: Partial<GridProps<SessionRow>> = {},
		cols: GridColumn<SessionRow>[] = sessionColumns,
	) {
		const onRowAdd = vi.fn()

		const onCommit = vi.fn()

		const view = renderUI(
			<>
				<button type="button">outside</button>
				<Grid
					columns={cols}
					rows={sessionRows}
					getKey={(row) => row.id}
					editable={{ session: 'managed', newRow: 'bottom', onRowAdd, onCommit, ...editable }}
					{...props}
				/>
			</>,
		)

		const slot = () => view.container.querySelector<HTMLElement>('[data-slot="grid-new-row"]')

		const slotCell = (col: string) =>
			present(
				view.container.querySelector<HTMLElement>(`td[data-grid-new-col="${col}"]`),
				`new-row cell ${col}`,
			)

		const slotEditor = (col: string) =>
			present<HTMLInputElement>(slotCell(col).querySelector('input'), `new-row editor ${col}`)

		return {
			...view,
			onRowAdd,
			onCommit,
			slot,
			slotCell,
			slotEditor,
			grid: () => view.getByRole('grid'),
			dataRows: () =>
				Array.from(view.container.querySelectorAll<HTMLElement>('tr[data-row-index]')),
			type: (col: string, value: string) =>
				fireEvent.change(slotEditor(col), { target: { value } }),
			press: (col: string, key: string) => fireEvent.keyDown(slotEditor(col), { key }),
		}
	}

	/** Whether `a` comes before `b` in document order. */
	const precedes = (a: Node, b: Node) =>
		(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0

	it('opens the whole slot to Tab while focus is in it, and closes it after', () => {
		const view = renderNewRow()

		const add = view.getByRole('button', { name: 'Add row' })

		expect(view.slotEditor('name')).toHaveAttribute('tabindex', '-1')

		expect(add).toHaveAttribute('tabindex', '-1')

		moveFocus(view.slotEditor('name'))

		expect(view.slotEditor('name')).not.toHaveAttribute('tabindex', '-1')

		expect(add).not.toHaveAttribute('tabindex', '-1')

		moveFocus(view.getByRole('button', { name: 'outside' }))

		expect(add).toHaveAttribute('tabindex', '-1')
	})

	it('makes the Add column a column of the cursor in the data rows', () => {
		const view = renderNewRow()

		const grid = view.grid()

		fireEvent.mouseDown(view.dataRows()[0]?.firstElementChild as HTMLElement)

		fireEvent.keyDown(grid, { key: 'End' })

		const cell = grid.querySelector<HTMLElement>(
			`[id="${grid.getAttribute('aria-activedescendant')}"]`,
		)

		expect(cell?.closest('tr')).toBe(view.dataRows()[0])

		expect(cell).toHaveAttribute('data-active')

		expect(cell).toBe(view.dataRows()[0]?.lastElementChild)
	})

	it('renders the slot after the data rows at the bottom', () => {
		const view = renderNewRow({ newRow: 'bottom' })

		const slot = view.slot() as HTMLElement

		expect(slot).toBeInTheDocument()

		expect(precedes(view.dataRows().at(-1) as HTMLElement, slot)).toBe(true)
	})

	it('renders the slot before the data rows at the top', () => {
		const view = renderNewRow({ newRow: 'top' })

		const slot = view.slot() as HTMLElement

		expect(precedes(slot, view.dataRows()[0] as HTMLElement)).toBe(true)
	})

	it('mounts an editor in each editable cell, with the new-row label', () => {
		const view = renderNewRow()

		expect(view.slot()).toHaveAttribute('aria-label', 'New row')

		expect(view.slotEditor('name')).toHaveAttribute('aria-label', 'Edit Name, new row')

		expect(view.slotEditor('count')).toHaveAttribute('aria-label', 'Edit Count, new row')

		// No data row enters edit mode for it.
		expect(editorsIn(view.container)).toHaveLength(2)
	})

	it('infers the editor of a slot cell from the rows of the same render', () => {
		const editable: GridEditableConfig = {
			session: 'managed',
			newRow: 'bottom',
			onRowAdd: vi.fn(),
			onCommit: vi.fn(),
		}

		const grid = (rows: SessionRow[]) => (
			<Grid columns={sessionColumns} rows={rows} getKey={(row) => row.id} editable={editable} />
		)

		const view = renderUI(grid([]))

		const countEditor = () =>
			present(
				view.container.querySelector<HTMLElement>('td[data-grid-new-col="count"]'),
				'new-row cell count',
			)

		// With no row to sample, the slot has a text editor.
		expect(bySlot(countEditor(), 'grid-edit-input')).toBeInTheDocument()

		// The rows arrive. The slot reads them in the render that brings them.
		view.rerender(grid(sessionRows))

		expect(bySlot(countEditor(), 'grid-edit-number-input')).toBeInTheDocument()
	})

	it('stays out of the sort, the filter, and the pagination', () => {
		const rows = Array.from({ length: 5 }, (_, i) => ({
			id: i + 1,
			name: `Row ${i + 1}`,
			count: i,
			done: false,
		}))

		const onRowAdd = vi.fn()

		const view = renderUI(
			<Grid
				columns={sessionColumns}
				rows={rows}
				getKey={(row) => row.id}
				sort={{ defaultValue: [{ column: 'name', direction: 'desc' }] }}
				pagination={{ defaultValue: { pageIndex: 1, pageSize: 2 } }}
				editable={{ session: 'managed', newRow: 'top', onRowAdd, onCommit: vi.fn() }}
			/>,
		)

		const slot = present(
			view.container.querySelector<HTMLElement>('[data-slot="grid-new-row"]'),
			'new row',
		)

		const dataRows = view.container.querySelectorAll('tr[data-row-index]')

		// The second page of a descending sort, two rows a page, and the slot
		// still first. The page holds two data rows, not one.
		expect(dataRows).toHaveLength(2)

		expect(dataRows[0]).toHaveTextContent('Row 3')

		expect(precedes(slot, dataRows[0] as HTMLElement)).toBe(true)

		// The sort does not reach the slot, which stays empty and first.
		expect(slot.querySelectorAll('input')).toHaveLength(2)
	})

	it('stays when a filter empties the data rows, and is not a selectable row', () => {
		const onRowAdd = vi.fn()

		const view = renderUI(
			<Grid
				columns={[
					{ id: '__select', title: '', selectable: true },
					// A column needs `value` to be searchable.
					{ ...(sessionColumns[0] as GridColumn<SessionRow>), value: (row) => row.name },
					sessionColumns[1] as GridColumn<SessionRow>,
				]}
				rows={sessionRows}
				getKey={(row) => row.id}
				search={{ value: 'no such row' }}
				editable={{ session: 'managed', newRow: 'bottom', onRowAdd, onCommit: vi.fn() }}
			/>,
		)

		const slot = present(
			view.container.querySelector<HTMLElement>('[data-slot="grid-new-row"]'),
			'new row',
		)

		// The search leaves no data row, and the slot still shows.
		expect(view.container.querySelectorAll('tr[data-row-index]')).toHaveLength(0)

		expect(slot).toBeInTheDocument()

		// The selection column renders an empty cell, with no checkbox to select it.
		expect(slot.querySelector('input[type="checkbox"]')).toBeNull()
	})

	it('calls onRowAdd with the drafted values alone on Enter, and clears the row', async () => {
		const view = renderNewRow()

		view.type('name', 'Carol')

		view.press('name', 'Enter')

		expect(view.onRowAdd).toHaveBeenCalledExactlyOnceWith({ name: 'Carol' })

		expect(view.onCommit).not.toHaveBeenCalled()

		expect(view.slotEditor('name').value).toBe('')

		// Focus goes back to the row's first editable cell, for the next entry.
		expect(view.slotEditor('name')).toHaveFocus()

		await expectAnnouncement('Row added')
	})

	it('adds through the Add control in a column of its own', () => {
		const view = renderNewRow()

		view.type('name', 'Carol')

		view.type('count', '7')

		const add = view.getByRole('button', { name: 'Add row' })

		// The control is in the grid's own last column, not in the last editor's cell.
		expect(view.slotCell(ADD_COLUMN)).toContainElement(add)

		expect(view.slotCell('count')).not.toContainElement(add)

		fireEvent.click(add)

		expect(view.onRowAdd).toHaveBeenCalledExactlyOnceWith({ name: 'Carol', count: 7 })
	})

	describe('the Add column', () => {
		/** The text of each header cell, the empty Add header as its screen-reader name. */
		const headers = (container: HTMLElement) =>
			Array.from(container.querySelectorAll('thead th')).map((th) => th.textContent)

		it('adds an empty, named last column to the header and to each data row', () => {
			const view = renderNewRow({}, { navigable: true })

			expect(headers(view.container)).toEqual(['Name', 'Count', 'Add row'])

			expect(view.grid()).toHaveAttribute('aria-colcount', '3')

			for (const row of view.dataRows()) {
				const cells = row.querySelectorAll('td')

				expect(cells).toHaveLength(3)

				// The cell shows nothing. It holds only the hidden marker of the cursor.
				expect(cells[2]).toHaveTextContent('')

				expect(cells[2]?.querySelector(':not([hidden])')).toBeNull()
			}
		})

		/** The width that the colgroup gives the Add column, the last one. */
		const addColWidth = (container: HTMLElement) =>
			present(container.querySelector<HTMLElement>('colgroup col:last-child'), 'the Add col').style
				.width

		it('fixes the column at newRowAdd.width', () => {
			const view = renderNewRow({ newRowAdd: { width: 90 } })

			expect(addColWidth(view.container)).toBe('90px')
		})

		it('keeps the fallback width where the control measures nothing', () => {
			// jsdom has no layout, so the Add cell reports no width. Saved widths take the
			// fixed layout, which gives the column a width.
			const view = renderNewRow({}, { columnSizing: { defaultValue: { name: 150, count: 150 } } })

			expect(addColWidth(view.container)).toBe(`${NEW_ROW_ADD_COLUMN_SIZE}px`)
		})

		it('gives the column no width in the automatic layout until the control measures', () => {
			const view = renderNewRow()

			expect(addColWidth(view.container)).toBe('')
		})

		it('resolves the width: none, fixed, measured, then the content', () => {
			expect(resolveNewRowAddWidth(false, undefined, 70)).toBeNull()

			expect(resolveNewRowAddWidth(true, false, 70)).toBeNull()

			expect(resolveNewRowAddWidth(true, { width: 90 }, 70)).toBe(90)

			expect(resolveNewRowAddWidth(true, {}, 70)).toBe(70)

			// Before its first measure, the column takes the width of its content.
			expect(resolveNewRowAddWidth(true, undefined, null)).toBeUndefined()
		})

		it('adds no column with newRowAdd false, and Enter still adds', () => {
			const view = renderNewRow({ newRowAdd: false })

			expect(headers(view.container)).toEqual(['Name', 'Count'])

			expect(view.queryByRole('button', { name: 'Add row' })).toBeNull()

			view.type('name', 'Carol')

			view.press('name', 'Enter')

			expect(view.onRowAdd).toHaveBeenCalledExactlyOnceWith({ name: 'Carol' })
		})

		it('renders a newRowAdd render slot with the add and the pending state', async () => {
			const flight = deferred()

			const onRowAdd = vi.fn(() => flight.promise)

			const render = vi.fn(({ add, pending }: GridNewRowAddContext) => (
				<button type="button" onClick={add}>
					{pending ? 'Saving' : 'Save person'}
				</button>
			))

			const view = renderNewRow({ onRowAdd, newRowAdd: { render } })

			expect(view.queryByRole('button', { name: 'Add row' })).toBeNull()

			const save = view.getByRole('button', { name: 'Save person' })

			expect(view.slotCell(ADD_COLUMN)).toContainElement(save)

			view.type('name', 'Carol')

			fireEvent.click(save)

			expect(onRowAdd).toHaveBeenCalledExactlyOnceWith({ name: 'Carol' })

			// The slot reads the add in flight, and its cell is inert until it settles.
			expect(save).toHaveTextContent('Saving')

			expect(save.closest('[inert]')).not.toBeNull()

			await act(async () => flight.resolve())

			expect(view.getByRole('button', { name: 'Save person' }).closest('[inert]')).toBeNull()
		})

		it('leaves the slot on Escape from the Add control, and keeps a data edit open', () => {
			const view = renderNewRow({ scope: 'cell' })

			fireEvent.doubleClick(
				present(view.container.querySelector<HTMLElement>('td[data-grid-col="name"]'), 'name cell'),
			)

			view.type('name', 'Carol')

			const add = view.getByRole('button', { name: 'Add row' })

			fireEvent.keyDown(add, { key: 'Escape' })

			// The data row's editor stays: Escape in the slot is the slot's.
			expect(editorsIn(view.container)).toHaveLength(3)

			expect(view.slotEditor('name').value).toBe('')

			// The cursor sits on the cell of the control: the Add column is a column of the cursor.
			expect(view.grid()).toHaveAttribute(
				'aria-activedescendant',
				add.closest('td')?.getAttribute('id') ?? '',
			)
		})

		it('keeps the column out of export and out of a saved preset', async () => {
			const onExport = vi.fn()

			const onSavePreset = vi.fn()

			const view = renderNewRow(
				{},
				{
					exportable: [{ csv: { onExport } }],
					columnManager: { toolbar: true, onSavePreset },
				},
			)

			const user = setupUser()

			await user.click(view.getByRole('button', { name: 'Manage columns' }))

			await user.click(view.getByRole('button', { name: 'Save as preset' }))

			expect(onSavePreset).toHaveBeenCalledWith(
				expect.objectContaining({ order: ['name', 'count'] }),
			)

			fireEvent.contextMenu(view.getAllByRole('columnheader')[0] as HTMLElement)

			fireEvent.click(view.getByRole('menuitem', { name: 'Export to CSV' }))

			const context = onExport.mock.calls[0]?.[0]

			expect(context.columns.map((column: GridColumn<SessionRow>) => column.id)).toEqual([
				'name',
				'count',
			])
		})
	})

	it('does nothing on an add with no value', () => {
		const view = renderNewRow()

		view.press('name', 'Enter')

		fireEvent.click(view.getByRole('button', { name: 'Add row' }))

		// A text typed and then cleared is no value either.
		view.type('name', 'x')

		view.type('name', '')

		view.press('name', 'Enter')

		expect(view.onRowAdd).not.toHaveBeenCalled()

		expect(liveRegion()?.textContent ?? '').toBe('')
	})

	it('blocks the add when validate refuses a cell, and shows the error', async () => {
		const cols: GridColumn<SessionRow>[] = [
			{
				...(sessionColumns[0] as GridColumn<SessionRow>),
				validate: (value) => (value === 'bad' ? 'Not a name' : null),
			},
			sessionColumns[1] as GridColumn<SessionRow>,
		]

		const view = renderNewRow({}, {}, cols)

		view.type('name', 'bad')

		view.press('name', 'Enter')

		expect(view.onRowAdd).not.toHaveBeenCalled()

		expect(view.slotCell('name')).toHaveTextContent('Not a name')

		expect(view.slotEditor('name').value).toBe('bad')

		await expectAnnouncement('Row not added, 1 cell refused')
	})

	describe('a required cell with no value', () => {
		// The name is required, and the count may not pass 5.
		const cols: GridColumn<SessionRow>[] = [
			{
				...(sessionColumns[0] as GridColumn<SessionRow>),
				required: true,
				validate: (value) => (String(value ?? '').trim() === '' ? 'Enter a name' : null),
			},
			{
				...(sessionColumns[1] as GridColumn<SessionRow>),
				validate: (value) => (Number(value) > 5 ? 'Too many' : null),
			},
		]

		it('blocks the add before it starts, and focuses the empty cell', async () => {
			const onRowAdd = vi.fn(() => new Promise<undefined>(() => {}))

			const view = renderNewRow({ onRowAdd }, {}, cols)

			view.type('count', '3')

			const add = view.getByRole('button', { name: 'Add row' })

			act(() => add.focus())

			fireEvent.click(add)

			expect(onRowAdd).not.toHaveBeenCalled()

			// The row never goes pending.
			expect(view.slot()).not.toHaveAttribute('aria-busy')

			expect(view.slotCell('name')).toHaveTextContent('Enter a name')

			expect(view.slotEditor('name')).toHaveFocus()

			expect(view.slotEditor('count').value).toBe('3')

			await expectAnnouncement('Row not added, 1 cell refused')

			// An edit clears the error, and the next add goes through.
			view.type('name', 'Carol')

			expect(view.slotCell('name')).not.toHaveTextContent('Enter a name')

			view.press('name', 'Enter')

			expect(onRowAdd).toHaveBeenCalledExactlyOnceWith({ name: 'Carol', count: 3 })
		})

		it('checks an empty row, and focuses the empty required cell', async () => {
			const view = renderNewRow({}, {}, cols)

			fireEvent.click(view.getByRole('button', { name: 'Add row' }))

			expect(view.onRowAdd).not.toHaveBeenCalled()

			expect(view.slotCell('name')).toHaveTextContent('Enter a name')

			expect(view.slotEditor('name')).toHaveFocus()

			await expectAnnouncement('Row not added, 1 cell refused')
		})

		it('focuses the first refused cell in display order', () => {
			const view = renderNewRow({}, {}, cols)

			view.type('count', '9')

			act(() => view.slotEditor('count').focus())

			view.press('count', 'Enter')

			expect(view.onRowAdd).not.toHaveBeenCalled()

			expect(view.slotCell('name')).toHaveTextContent('Enter a name')

			expect(view.slotCell('count')).toHaveTextContent('Too many')

			expect(view.slotEditor('name')).toHaveFocus()
		})

		it('gives validate no empty cell of a column that is not required', () => {
			const validate = vi.fn(() => 'Refused')

			const view = renderNewRow({}, {}, [
				sessionColumns[0] as GridColumn<SessionRow>,
				{ ...(sessionColumns[1] as GridColumn<SessionRow>), validate },
			])

			view.type('name', 'Carol')

			view.press('name', 'Enter')

			expect(validate).not.toHaveBeenCalled()

			expect(view.onRowAdd).toHaveBeenCalledExactlyOnceWith({ name: 'Carol' })
		})
	})

	describe('a validate that reads another cell', () => {
		// The count may not pass 5 while the name is Big.
		const cols: GridColumn<SessionRow>[] = [
			sessionColumns[0] as GridColumn<SessionRow>,
			{
				...(sessionColumns[1] as GridColumn<SessionRow>),
				validate: (value, row) => (row.name === 'Big' && Number(value) > 5 ? 'Too many' : null),
			},
		]

		it('reads the current value of the other cell as the user types', () => {
			const view = renderNewRow({}, {}, cols)

			view.type('name', 'Big')

			view.type('count', '9')

			expect(view.slotCell('count')).toHaveTextContent('Too many')
		})

		it('reads a cell with no field by its column id, as the add does', () => {
			const tagged: GridColumn<SessionRow>[] = [
				{
					...(sessionColumns[1] as GridColumn<SessionRow>),
					validate: (value, row) =>
						(row as Record<string, unknown>).tag === 'x' && Number(value) > 5 ? 'Too many' : null,
				},
				{
					id: 'tag',
					title: 'Tag',
					cell: () => '',
					editCell: ({ value, onValueUpdate, ariaLabel }) => (
						<input
							aria-label={ariaLabel}
							value={String(value ?? '')}
							onChange={(event) => onValueUpdate(event.target.value)}
						/>
					),
				},
			]

			const view = renderNewRow({}, {}, tagged)

			view.type('tag', 'x')

			view.type('count', '9')

			expect(view.slotCell('count')).toHaveTextContent('Too many')
		})

		it('shows the error of a blocked add on the cell that refuses it', async () => {
			const view = renderNewRow({}, {}, cols)

			view.type('count', '9')

			view.type('name', 'Big')

			view.press('name', 'Enter')

			expect(view.onRowAdd).not.toHaveBeenCalled()

			expect(view.slotCell('count')).toHaveTextContent('Too many')

			await expectAnnouncement('Row not added, 1 cell refused')
		})
	})

	it('reads the values as the row that validate sees', () => {
		const validate = vi.fn(() => null)

		const cols: GridColumn<SessionRow>[] = [
			{ ...(sessionColumns[0] as GridColumn<SessionRow>), validate },
			sessionColumns[1] as GridColumn<SessionRow>,
		]

		const view = renderNewRow({}, {}, cols)

		view.type('count', '3')

		view.type('name', 'Carol')

		validate.mockClear()

		view.press('name', 'Enter')

		expect(validate).toHaveBeenCalledWith('Carol', { name: 'Carol', count: 3 })
	})

	describe('an async add', () => {
		function renderAsync() {
			let resolve: (value?: GridCellRefusal[]) => void = () => {}

			let reject: (reason: unknown) => void = () => {}

			const onRowAdd = vi.fn(
				(_values: Record<string, unknown>) =>
					new Promise<GridCellRefusal[] | undefined>((fulfill, fail) => {
						resolve = fulfill

						reject = fail
					}),
			)

			const view = renderNewRow({ onRowAdd })

			return {
				...view,
				onRowAdd,
				resolve: (value?: GridCellRefusal[]) => act(async () => resolve(value)),
				reject: (reason: unknown) => act(async () => reject(reason)),
				add: () => view.getByRole('button', { name: 'Add row' }),
			}
		}

		it('shows the row as pending, and blocks a second add until it settles', async () => {
			const view = renderAsync()

			view.type('name', 'Carol')

			const editor = view.slotEditor('name')

			act(() => editor.focus())

			view.press('name', 'Enter')

			expect(view.slotCell('name')).toHaveAttribute('aria-busy', 'true')

			// The editor stays mounted with its value, so the row keeps its fields.
			expect(view.slotEditor('name')).toBe(editor)

			expect(editor.value).toBe('Carol')

			// The editors turn inert, with the Add control, so focus rests on the grid.
			expect(editor.closest('[inert]')).not.toBeNull()

			expect(view.add().closest('[inert]')).not.toBeNull()

			expect(view.grid()).toHaveFocus()

			fireEvent.click(view.add())

			fireEvent.keyDown(view.grid(), { key: 'Enter' })

			expect(view.onRowAdd).toHaveBeenCalledTimes(1)

			await view.resolve()

			expect(view.slotCell('name')).not.toHaveAttribute('aria-busy')

			expect(view.slotEditor('name').closest('[inert]')).toBeNull()

			expect(view.slotEditor('name').value).toBe('')

			// Focus was still in the grid, so it goes to the first editable cell.
			expect(view.slotEditor('name')).toHaveFocus()

			await expectAnnouncement('Row added')

			view.type('name', 'Dave')

			view.press('name', 'Enter')

			expect(view.onRowAdd).toHaveBeenCalledTimes(2)
		})

		it('restores the drafts with the errors of a resolved refusal', async () => {
			const view = renderAsync()

			view.type('name', 'Carol')

			view.type('count', '4')

			view.press('name', 'Enter')

			// The `rowKey` of a refusal is ignored, as the slot has no key.
			await view.resolve([{ rowKey: 'anything', columnId: 'name', error: 'Name taken' }])

			expect(view.slotEditor('name').closest('[inert]')).toBeNull()

			expect(view.slotEditor('name').value).toBe('Carol')

			expect(view.slotCell('name')).toHaveTextContent('Name taken')

			expect(view.slotEditor('count').value).toBe('4')

			await expectAnnouncement('Row not added, 1 cell refused')

			// A retry sends the restored values.
			view.press('name', 'Enter')

			expect(view.onRowAdd).toHaveBeenLastCalledWith({ name: 'Carol', count: 4 })
		})

		it('focuses the first refused cell when focus is still in the grid', async () => {
			const view = renderAsync()

			view.type('name', 'Carol')

			view.type('count', '4')

			act(() => view.slotEditor('name').focus())

			view.press('name', 'Enter')

			expect(view.grid()).toHaveFocus()

			await view.resolve([{ rowKey: 'new', columnId: 'count', error: 'Too many' }])

			expect(view.slotCell('count')).toHaveTextContent('Too many')

			expect(view.slotEditor('count')).toHaveFocus()
		})

		it('refuses each drafted cell on a rejection, with its message', async () => {
			const view = renderAsync()

			view.type('name', 'Carol')

			view.press('name', 'Enter')

			await view.reject(new Error('Server down'))

			expect(view.slotEditor('name').value).toBe('Carol')

			expect(view.slotCell('name')).toHaveTextContent('Server down')

			await expectAnnouncement('Row not added, 1 cell refused')
		})
	})

	it('clears the row on Escape, and puts focus on the grid', () => {
		const view = renderNewRow()

		view.type('name', 'Carol')

		act(() => view.slotEditor('name').focus())

		view.press('name', 'Escape')

		expect(view.slotEditor('name').value).toBe('')

		expect(view.grid()).toHaveFocus()

		expect(view.grid()).toHaveAttribute('aria-activedescendant', view.slotCell('name').id)

		view.press('name', 'Enter')

		expect(view.onRowAdd).not.toHaveBeenCalled()
	})

	it('leaves a data session open on Escape in the row', () => {
		const view = renderNewRow({ scope: 'cell' })

		fireEvent.doubleClick(
			present(view.container.querySelector<HTMLElement>('td[data-grid-col="name"]'), 'name cell'),
		)

		view.press('name', 'Escape')

		// The data row's editor stays: Escape in the slot is the slot's.
		expect(editorsIn(view.container)).toHaveLength(3)
	})

	for (const commitOn of ['explicit', 'leaveEditor', 'leaveGrid'] as const) {
		it(`never adds when focus leaves the row under commitOn '${commitOn}'`, () => {
			const view = renderNewRow({ commitOn })

			view.type('name', 'Carol')

			moveFocus(view.slotEditor('name'))

			moveFocus(view.slotEditor('count'))

			moveFocus(view.grid())

			moveFocus(view.getByRole('button', { name: 'outside' }))

			expect(view.onRowAdd).not.toHaveBeenCalled()

			expect(view.onCommit).not.toHaveBeenCalled()

			// The draft stays for the user to finish.
			expect(view.slotEditor('name').value).toBe('Carol')
		})
	}

	describe('ARIA rows', () => {
		it('counts the row at the bottom, after the data rows', () => {
			const view = renderNewRow({ newRow: 'bottom' }, { navigable: true })

			// A header row, two data rows, and the slot.
			expect(view.grid()).toHaveAttribute('aria-rowcount', '4')

			expect(view.dataRows().map((row) => row.getAttribute('aria-rowindex'))).toEqual(['2', '3'])

			expect(view.slot()).toHaveAttribute('aria-rowindex', '4')
		})

		it('counts the row at the top, and shifts the data rows down one', () => {
			const view = renderNewRow({ newRow: 'top' }, { navigable: true })

			expect(view.grid()).toHaveAttribute('aria-rowcount', '4')

			expect(view.slot()).toHaveAttribute('aria-rowindex', '2')

			expect(view.dataRows().map((row) => row.getAttribute('aria-rowindex'))).toEqual(['3', '4'])

			expect(view.slotCell('name')).toHaveAttribute('aria-colindex', '1')
		})
	})

	describe('the keyboard cursor', () => {
		const active = (view: ReturnType<typeof renderNewRow>) =>
			view.grid().getAttribute('aria-activedescendant')

		const dataCell = (view: ReturnType<typeof renderNewRow>, col: string, row: number) =>
			view.container.querySelectorAll<HTMLElement>(`td[data-grid-col="${col}"]`)[row] as HTMLElement

		it('reaches the bottom row with ArrowDown from the last data row, and no further', () => {
			const view = renderNewRow({ newRow: 'bottom' })

			const grid = view.grid()

			moveFocus(grid)

			fireEvent.keyDown(grid, { key: 'ArrowDown' })

			expect(active(view)).toBe(dataCell(view, 'name', 1).id)

			fireEvent.keyDown(grid, { key: 'ArrowDown' })

			expect(active(view)).toBe(view.slotCell('name').id)

			fireEvent.keyDown(grid, { key: 'ArrowDown' })

			expect(active(view)).toBe(view.slotCell('name').id)

			fireEvent.keyDown(grid, { key: 'ArrowUp' })

			expect(active(view)).toBe(dataCell(view, 'name', 1).id)
		})

		it('reaches the top row with ArrowUp from the first data row', () => {
			const view = renderNewRow({ newRow: 'top' })

			const grid = view.grid()

			moveFocus(grid)

			// The slot is first in the cursor's order, so the cursor seeds there.
			expect(active(view)).toBe(view.slotCell('name').id)

			fireEvent.keyDown(grid, { key: 'ArrowDown' })

			expect(active(view)).toBe(dataCell(view, 'name', 0).id)

			fireEvent.keyDown(grid, { key: 'ArrowUp' })

			expect(active(view)).toBe(view.slotCell('name').id)
		})

		it('opens the cell of the row with Enter, and a typed key seeds it', () => {
			const view = renderNewRow({ newRow: 'top' })

			const grid = view.grid()

			moveFocus(grid)

			fireEvent.keyDown(grid, { key: 'Enter' })

			expect(view.slotEditor('name')).toHaveFocus()

			fireEvent.keyDown(view.slotEditor('name'), { key: 'F2' })

			expect(grid).toHaveFocus()

			fireEvent.keyDown(grid, { key: 'ArrowRight' })

			fireEvent.keyDown(grid, { key: '7' })

			expect(view.slotEditor('count')).toHaveFocus()

			expect(view.slotEditor('count').value).toBe('7')
		})

		// The pressed cell is in view, as on a data cell. A focus that scrolls
		// would reveal the whole table and move the content under the pointer.
		it('focuses the table without a scroll on a press of a slot cell', () => {
			const view = renderNewRow({ newRow: 'bottom' })

			const grid = view.grid()

			const focus = vi.spyOn(HTMLElement.prototype, 'focus')

			fireEvent.mouseDown(view.slotCell('name'))

			const onGrid = focus.mock.calls.filter((_, index) => focus.mock.contexts[index] === grid)

			expect(onGrid).toEqual([[{ preventScroll: true }]])

			expect(active(view)).toBe(view.slotCell('name').id)
		})

		// A press on an editor of the slot seats the cursor as a press on the rest
		// of the cell does. The editor takes the focus, so the table does not.
		it('seats the cursor on a press of a slot editor, and leaves the focus to the editor', () => {
			const view = renderNewRow({ newRow: 'bottom' })

			expect(fireEvent.mouseDown(view.slotEditor('count'))).toBe(true)

			expect(active(view)).toBe(view.slotCell('count').id)

			expect(view.grid()).not.toHaveFocus()
		})

		// While a pen drags the range, the tap of a palm sends a primary press
		// too. A press on the slot during the drag does not seat the cursor.
		it('keeps the cursor on the cell of a range drag when a palm presses a slot cell', () => {
			const view = renderNewRow({ newRow: 'bottom' }, { range: true })

			fireEvent.mouseDown(dataCell(view, 'name', 0))

			fireEvent.mouseDown(view.slotCell('count'))

			expect(active(view)).toBe(dataCell(view, 'name', 0).id)

			fireEvent.mouseUp(dataCell(view, 'name', 0))

			fireEvent.mouseDown(view.slotCell('count'))

			expect(active(view)).toBe(view.slotCell('count').id)
		})
	})

	/**
	 * The yes/no editor of the slot shows no choice until the user picks one.
	 * What it shows is what adds: no choice adds no value, and a pick adds it.
	 */
	describe('a yes/no column', () => {
		const doneColumn: GridColumn<SessionRow> = {
			id: 'done',
			title: 'Done',
			field: 'done',
			cell: (row) => (row.done ? 'Yes' : 'No'),
		}

		/** The listbox trigger of the slot's `done` cell. */
		const trigger = (view: ReturnType<typeof renderNewRow>) =>
			getSlot<HTMLButtonElement>(view.slotCell('done'), 'listbox-button')

		/** Opens the slot's yes/no listbox and picks `choice`. */
		const pick = (view: ReturnType<typeof renderNewRow>, choice: 'Yes' | 'No') => {
			fireEvent.click(trigger(view))

			fireEvent.click(view.getByRole('option', { name: choice }))
		}

		it('shows no choice untouched, and an add of the other fields omits it', () => {
			const view = renderNewRow({}, {}, [...sessionColumns, doneColumn])

			expect(trigger(view)).not.toHaveTextContent(/yes|no/i)

			expect(trigger(view)).toHaveTextContent('Select')

			view.type('name', 'Carol')

			view.press('name', 'Enter')

			expect(view.onRowAdd).toHaveBeenCalledExactlyOnceWith({ name: 'Carol' })
		})

		it('adds false for a pick of No', () => {
			const view = renderNewRow({}, {}, [...sessionColumns, doneColumn])

			pick(view, 'No')

			expect(trigger(view)).toHaveTextContent('No')

			view.type('name', 'Carol')

			view.press('name', 'Enter')

			expect(view.onRowAdd).toHaveBeenCalledExactlyOnceWith({ name: 'Carol', done: false })
		})

		it('is empty again after a pick and an Escape', () => {
			const view = renderNewRow({}, {}, [...sessionColumns, doneColumn])

			pick(view, 'Yes')

			fireEvent.keyDown(view.slotEditor('name'), { key: 'Escape' })

			expect(trigger(view)).toHaveTextContent('Select')

			fireEvent.click(view.getByRole('button', { name: 'Add row' }))

			expect(view.onRowAdd).not.toHaveBeenCalled()
		})

		it('makes no add from an untouched row with only a yes/no column', () => {
			const view = renderNewRow({}, {}, [
				{ id: 'name', title: 'Name', cell: (row) => row.name },
				doneColumn,
			])

			fireEvent.click(view.getByRole('button', { name: 'Add row' }))

			fireEvent.keyDown(view.slotCell('done'), { key: 'Enter' })

			expect(view.onRowAdd).not.toHaveBeenCalled()

			pick(view, 'No')

			fireEvent.click(view.getByRole('button', { name: 'Add row' }))

			expect(view.onRowAdd).toHaveBeenCalledExactlyOnceWith({ done: false })
		})

		it('keeps the data rows showing No for a false value', () => {
			const view = renderNewRow({ rows: new Set([1]) }, {}, [...sessionColumns, doneColumn])

			const dataCell = present(
				view.container.querySelector<HTMLElement>('td[data-grid-col="done"]'),
				'data done cell',
			)

			expect(getSlot(dataCell, 'listbox-button')).toHaveTextContent('No')
		})
	})

	describe('config warnings', () => {
		it("warns and renders no row under session 'manual'", () => {
			const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

			const view = renderNewRow({ session: 'manual' })

			expect(view.slot()).toBeNull()

			expect(warn).toHaveBeenCalledWith(expect.stringContaining('`editable.newRow`'))

			expect(warn).toHaveBeenCalledWith(expect.stringContaining("'manual'"))
		})

		it('warns and renders no row without onRowAdd', () => {
			const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

			const view = renderNewRow({ onRowAdd: undefined })

			expect(view.slot()).toBeNull()

			expect(warn).toHaveBeenCalledWith(expect.stringContaining('`editable.onRowAdd`'))
		})

		it('does not warn for a row that can show', () => {
			const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

			renderNewRow()

			expect(warn).not.toHaveBeenCalledWith(expect.stringContaining('newRow'))
		})
	})
})
