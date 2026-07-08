import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { Grid, type GridColumn } from '../../modules/grid'
import { bySlot, fireEvent, liveRegion, renderUI } from '../helpers'

/**
 * Per-row inline editing baked into Grid: a row in the `editable` set puts all of
 * its editable cells into edit mode at once (the editor inferred from the value's
 * primitive type, or a column `editCell` slot). Edits stage live; removing the
 * row from the set saves its changed cells as one batch through `onValueChange`,
 * and Escape reverts a cell.
 */
describe('Grid per-row editing', () => {
	type Row = { id: number; name: string; count: number; done: boolean }

	const baseRows: Row[] = [
		{ id: 1, name: 'Alice', count: 2, done: false },
		{ id: 2, name: 'Bob', count: 5, done: true },
	]

	const columns: GridColumn<Row>[] = [
		{ id: 'name', title: 'Name', field: 'name', cell: (row) => row.name },
		{ id: 'count', title: 'Count', field: 'count', cell: (row) => String(row.count) },
		{ id: 'done', title: 'Done', field: 'done', cell: (row) => (row.done ? 'Yes' : 'No') },
	]

	function renderGrid(cols: GridColumn<Row>[] = columns) {
		const onValueChange = vi.fn()

		function Harness() {
			const [editing, setEditing] = useState<Set<string | number>>(new Set())

			return (
				<>
					<button type="button" onClick={() => setEditing(new Set([1]))}>
						edit-1
					</button>
					<button type="button" onClick={() => setEditing(new Set())}>
						save
					</button>
					<Grid
						columns={cols}
						rows={baseRows}
						getKey={(row) => row.id}
						editable={{ rows: editing, onRowsChange: setEditing, onValueChange }}
					/>
				</>
			)
		}

		const view = renderUI(<Harness />)

		return {
			...view,
			onValueChange,
			editRow1: () => fireEvent.click(view.getByRole('button', { name: 'edit-1' })),
			save: () => fireEvent.click(view.getByRole('button', { name: 'save' })),
		}
	}

	it('renders display content, not editors, for a row that is not editable', () => {
		const { container } = renderGrid()

		expect(bySlot(container, 'grid-edit-input')).toBeNull()
	})

	it('puts every editable cell of an editable row into edit mode, inferring the editor by value type', () => {
		const { container, editRow1 } = renderGrid()

		editRow1()

		// name → text input, count → number input, done → yes/no listbox.
		expect(bySlot(container, 'grid-edit-input')).toBeInTheDocument()

		expect(bySlot(container, 'grid-edit-number-input')).toBeInTheDocument()

		expect(bySlot(container, 'grid-edit-boolean-input')).toBeInTheDocument()
	})

	it("marks a required column's editor aria-required, leaving others unmarked", () => {
		const { container, editRow1 } = renderGrid([
			{ id: 'name', title: 'Name', field: 'name', cell: (row) => row.name, required: true },
			{ id: 'count', title: 'Count', field: 'count', cell: (row) => String(row.count) },
		])

		editRow1()

		// The required column's editor advertises the obligation to AT (WCAG 1.3.1 /
		// 3.3.2); a non-required column's editor omits it.
		expect(bySlot(container, 'grid-edit-input')).toHaveAttribute('aria-required', 'true')

		expect(bySlot(container, 'grid-edit-number-input')).not.toHaveAttribute('aria-required')
	})

	it('saves a row (removing it from the set) as one batch of its changed cells', () => {
		const { container, editRow1, save, onValueChange } = renderGrid()

		editRow1()

		fireEvent.change(bySlot(container, 'grid-edit-input') as HTMLInputElement, {
			target: { value: 'Alicia' },
		})

		save()

		expect(onValueChange).toHaveBeenCalledTimes(1)

		expect(onValueChange).toHaveBeenCalledWith([{ rowKey: 1, columnId: 'name', value: 'Alicia' }])
	})

	it('emits nothing when the row is saved with no changes', () => {
		const { editRow1, save, onValueChange } = renderGrid()

		editRow1()

		save()

		expect(onValueChange).not.toHaveBeenCalled()
	})

	it('reverts a cell on Escape and does not save it', () => {
		const { container, editRow1, save, onValueChange } = renderGrid()

		editRow1()

		const input = bySlot(container, 'grid-edit-input') as HTMLInputElement

		fireEvent.change(input, { target: { value: 'Discarded' } })

		fireEvent.keyDown(input, { key: 'Escape' })

		// The editor stays open (the row is still editing) and resets to the value.
		expect((bySlot(container, 'grid-edit-input') as HTMLInputElement).value).toBe('Alice')

		save()

		expect(onValueChange).not.toHaveBeenCalled()
	})

	it('uses a column editCell slot instead of the inferred editor', () => {
		const slotColumns: GridColumn<Row>[] = [
			{
				id: 'name',
				title: 'Name',
				field: 'name',
				cell: (row) => row.name,
				editCell: ({ value, onValueUpdate }) => (
					<input
						data-slot="custom-edit"
						value={String(value ?? '')}
						onChange={(event) => onValueUpdate(event.target.value)}
					/>
				),
			},
		]

		const { container, editRow1, save, onValueChange } = renderGrid(slotColumns)

		editRow1()

		expect(bySlot(container, 'custom-edit')).toBeInTheDocument()

		expect(bySlot(container, 'grid-edit-input')).toBeNull()

		fireEvent.change(bySlot(container, 'custom-edit') as HTMLInputElement, {
			target: { value: 'Slotted' },
		})

		save()

		expect(onValueChange).toHaveBeenCalledWith([{ rowKey: 1, columnId: 'name', value: 'Slotted' }])
	})

	it('shows a live validation error and skips an invalid cell on save', () => {
		const validatedColumns: GridColumn<Row>[] = [
			{
				id: 'name',
				title: 'Name',
				field: 'name',
				cell: (row) => row.name,
				validate: (value) => (String(value).length > 0 ? null : 'Required'),
			},
		]

		const { container, editRow1, save, onValueChange } = renderGrid(validatedColumns)

		editRow1()

		fireEvent.change(bySlot(container, 'grid-edit-input') as HTMLInputElement, {
			target: { value: '' },
		})

		expect(container.querySelector('[role="alert"]')).toHaveTextContent('Required')

		save()

		// The invalid cell is dropped, not emitted.
		expect(onValueChange).not.toHaveBeenCalled()

		// A valid value saves.
		editRow1()

		fireEvent.change(bySlot(container, 'grid-edit-input') as HTMLInputElement, {
			target: { value: 'Fixed' },
		})

		save()

		expect(onValueChange).toHaveBeenCalledWith([{ rowKey: 1, columnId: 'name', value: 'Fixed' }])
	})

	it('links the editor to its validation error for assistive tech', () => {
		const validatedColumns: GridColumn<Row>[] = [
			{
				id: 'name',
				title: 'Name',
				field: 'name',
				cell: (row) => row.name,
				validate: (value) => (String(value).length > 0 ? null : 'Required'),
			},
		]

		const { container, editRow1 } = renderGrid(validatedColumns)

		editRow1()

		const input = bySlot(container, 'grid-edit-input') as HTMLInputElement

		fireEvent.change(input, { target: { value: '' } })

		const alert = container.querySelector('[role="alert"]') as HTMLElement

		expect(alert).toHaveTextContent('Required')

		// The editor is marked invalid and points at the message, so the error
		// reaches AT and not only sighted users.
		expect(input).toHaveAttribute('aria-invalid', 'true')

		expect(alert.id).toBeTruthy()

		expect(input).toHaveAttribute('aria-describedby', alert.id)
	})

	it('announces the commit politely when a row is saved', async () => {
		const { container, editRow1, save } = renderGrid()

		editRow1()

		fireEvent.change(bySlot(container, 'grid-edit-input') as HTMLInputElement, {
			target: { value: 'Alicia' },
		})

		save()

		// The announcer sets its region on a microtask; flush it rather than waiting,
		// so the grid's debounced row-count status doesn't fire mid-test.
		await Promise.resolve()

		expect(liveRegion()).toHaveTextContent('1 cell updated')
	})

	it('does not enter edit mode on a cell double-click in the default manual mode', () => {
		const { container } = renderGrid()

		fireEvent.doubleClick(container.querySelector('td[data-grid-col="name"]') as HTMLElement)

		expect(bySlot(container, 'grid-edit-input')).toBeNull()
	})
})

/**
 * Grid-owned edit sessions (`editable.trigger: 'doubleClick'`): double-clicking
 * an editable data cell — through the grid's built-in cell double-click event —
 * or pressing Enter on the keyboard cursor's active cell puts its row into edit
 * mode and focuses that cell's editor; an editor's Enter saves the row as the
 * usual one-batch commit and Escape abandons its staged edits, focus returning
 * to the grid's tab stop either way. Entry and exit flow through the same
 * controllable set, so `onRowsChange` reports every transition.
 */
describe("Grid double-click-to-edit (trigger: 'doubleClick')", () => {
	type Row = { id: number; name: string; count: number; done: boolean }

	const baseRows: Row[] = [
		{ id: 1, name: 'Alice', count: 2, done: false },
		{ id: 2, name: 'Bob', count: 5, done: true },
	]

	const columns: GridColumn<Row>[] = [
		{ id: 'name', title: 'Name', field: 'name', cell: (row) => row.name },
		{ id: 'count', title: 'Count', field: 'count', cell: (row) => String(row.count) },
	]

	function renderTriggerGrid(cols: GridColumn<Row>[] = columns) {
		const onValueChange = vi.fn()

		const onRowsChange = vi.fn()

		const view = renderUI(
			<Grid
				columns={cols}
				rows={baseRows}
				getKey={(row) => row.id}
				editable={{ trigger: 'doubleClick', onRowsChange, onValueChange }}
			/>,
		)

		return {
			...view,
			onValueChange,
			onRowsChange,
			cell: (col: string, rowIndex = 0) =>
				view.container.querySelectorAll<HTMLElement>(`td[data-grid-col="${col}"]`)[
					rowIndex
				] as HTMLElement,
		}
	}

	it("puts the row into edit mode on an editable cell double-click and focuses that cell's editor", () => {
		const { container, cell, onRowsChange } = renderTriggerGrid()

		fireEvent.doubleClick(cell('name'))

		// The whole row edits (the per-row model), and the double-clicked cell's
		// editor takes focus.
		expect(bySlot(container, 'grid-edit-input')).toHaveFocus()

		expect(bySlot(container, 'grid-edit-number-input')).toBeInTheDocument()

		// The entry flows through the controllable set, so a bound consumer hears it.
		expect(onRowsChange).toHaveBeenCalledWith(new Set([1]))
	})

	it('ignores a double-click on a readOnly column', () => {
		const { container, cell } = renderTriggerGrid([
			{ id: 'name', title: 'Name', field: 'name', cell: (row) => row.name },
			{
				id: 'count',
				title: 'Count',
				field: 'count',
				cell: (row) => String(row.count),
				readOnly: true,
			},
		])

		fireEvent.doubleClick(cell('count'))

		expect(bySlot(container, 'grid-edit-input')).toBeNull()
	})

	it('saves the row as one batch on Enter and returns focus to the grid', () => {
		const { container, cell, onValueChange, getByRole } = renderTriggerGrid()

		fireEvent.doubleClick(cell('name'))

		const input = bySlot(container, 'grid-edit-input') as HTMLInputElement

		fireEvent.change(input, { target: { value: 'Alicia' } })

		fireEvent.keyDown(input, { key: 'Enter' })

		expect(onValueChange).toHaveBeenCalledTimes(1)

		expect(onValueChange).toHaveBeenCalledWith([{ rowKey: 1, columnId: 'name', value: 'Alicia' }])

		// The editors close and the keyboard lands back on the grid's tab stop.
		expect(bySlot(container, 'grid-edit-input')).toBeNull()

		expect(getByRole('grid')).toHaveFocus()
	})

	it("abandons the row's staged edits on Escape without emitting", () => {
		const { container, cell, onValueChange } = renderTriggerGrid()

		fireEvent.doubleClick(cell('name'))

		const input = bySlot(container, 'grid-edit-input') as HTMLInputElement

		fireEvent.change(input, { target: { value: 'Discarded' } })

		fireEvent.keyDown(input, { key: 'Escape' })

		expect(bySlot(container, 'grid-edit-input')).toBeNull()

		expect(onValueChange).not.toHaveBeenCalled()

		// The drafts are dropped, not held: re-entering shows the row's value.
		fireEvent.doubleClick(cell('name'))

		expect((bySlot(container, 'grid-edit-input') as HTMLInputElement).value).toBe('Alice')
	})

	it("enters edit mode from the keyboard: Enter on the cursor's active cell", () => {
		const { container, getByRole } = renderTriggerGrid()

		const grid = getByRole('grid')

		// Tab into the grid seeds the cursor on the first cell; Enter begins the edit.
		fireEvent.focus(grid)

		fireEvent.keyDown(grid, { key: 'Enter' })

		expect(bySlot(container, 'grid-edit-input')).toHaveFocus()
	})
})
