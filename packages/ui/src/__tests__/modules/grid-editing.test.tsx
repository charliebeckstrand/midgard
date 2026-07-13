import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { Grid, type GridColumn } from '../../modules/grid'
import { act, bySlot, fireEvent, liveRegion, renderUI } from '../helpers'

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

	it('abandons the session on Escape from any editor, not just the inferred inputs', () => {
		const { container, cell, onValueChange } = renderTriggerGrid([
			{ id: 'name', title: 'Name', field: 'name', cell: (row) => row.name },
			{ id: 'done', title: 'Done', field: 'done', cell: (row) => (row.done ? 'Yes' : 'No') },
		])

		fireEvent.doubleClick(cell('name'))

		// Escape from the (closed) boolean listbox abandons like from a text input:
		// the editing cell's host owns the key, not each editor.
		fireEvent.keyDown(bySlot(container, 'grid-edit-boolean-input') as HTMLElement, {
			key: 'Escape',
		})

		expect(bySlot(container, 'grid-edit-input')).toBeNull()

		expect(onValueChange).not.toHaveBeenCalled()
	})

	it('defers Escape to an open floating surface inside the cell', () => {
		const { container, cell } = renderTriggerGrid([
			{
				id: 'name',
				title: 'Name',
				field: 'name',
				cell: (row) => row.name,
				editCell: () => (
					<button type="button" data-slot="open-disclosure" aria-expanded="true">
						open
					</button>
				),
			},
		])

		fireEvent.doubleClick(cell('name'))

		// The press belongs to the open surface — its document-level escape layer
		// closes it after this handler — so the session stays alive.
		fireEvent.keyDown(bySlot(container, 'open-disclosure') as HTMLElement, { key: 'Escape' })

		expect(bySlot(container, 'open-disclosure')).toBeInTheDocument()
	})
})

/**
 * Cell-scoped sessions (`editable.scope: 'cell'`): one session covers a single
 * cell, not a row — the entered cell alone mounts its editor, its save is a
 * one-change batch through the same sink, and entering another cell commits the
 * previously active one. The session's row still rides the controllable
 * editable set, so `onRowsChange` reports every transition.
 */
describe("Grid cell-scoped sessions (scope: 'cell')", () => {
	type Row = { id: number; name: string; count: number; done: boolean }

	const baseRows: Row[] = [
		{ id: 1, name: 'Alice', count: 2, done: false },
		{ id: 2, name: 'Bob', count: 5, done: true },
	]

	const columns: GridColumn<Row>[] = [
		{ id: 'name', title: 'Name', field: 'name', cell: (row) => row.name },
		{ id: 'count', title: 'Count', field: 'count', cell: (row) => String(row.count) },
	]

	function renderCellGrid(cols: GridColumn<Row>[] = columns) {
		const onValueChange = vi.fn()

		const onRowsChange = vi.fn()

		const view = renderUI(
			<Grid
				columns={cols}
				rows={baseRows}
				getKey={(row) => row.id}
				editable={{ trigger: 'doubleClick', scope: 'cell', onRowsChange, onValueChange }}
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

	it('mounts an editor in the double-clicked cell alone, not the whole row', () => {
		const { container, cell, onRowsChange } = renderCellGrid()

		fireEvent.doubleClick(cell('name'))

		// The entered cell edits; its row-mates keep their display content.
		expect(bySlot(container, 'grid-edit-input')).toHaveFocus()

		expect(bySlot(container, 'grid-edit-number-input')).toBeNull()

		// The session's row still flows through the controllable set.
		expect(onRowsChange).toHaveBeenCalledWith(new Set([1]))
	})

	it('saves just the cell on Enter, as a one-change batch', () => {
		const { container, cell, onValueChange, getByRole } = renderCellGrid()

		// The last row, so Enter's commit has no next row to move into and the
		// session simply closes (the move itself is covered below).
		fireEvent.doubleClick(cell('name', 1))

		const input = bySlot(container, 'grid-edit-input') as HTMLInputElement

		fireEvent.change(input, { target: { value: 'Bobby' } })

		fireEvent.keyDown(input, { key: 'Enter' })

		expect(onValueChange).toHaveBeenCalledTimes(1)

		expect(onValueChange).toHaveBeenCalledWith([{ rowKey: 2, columnId: 'name', value: 'Bobby' }])

		// The session closes and the keyboard lands back on the grid's tab stop.
		expect(bySlot(container, 'grid-edit-input')).toBeNull()

		expect(getByRole('grid')).toHaveFocus()
	})

	it("abandons the cell's staged edit on Escape without emitting", () => {
		const { container, cell, onValueChange } = renderCellGrid()

		fireEvent.doubleClick(cell('name'))

		const input = bySlot(container, 'grid-edit-input') as HTMLInputElement

		fireEvent.change(input, { target: { value: 'Discarded' } })

		fireEvent.keyDown(input, { key: 'Escape' })

		expect(bySlot(container, 'grid-edit-input')).toBeNull()

		expect(onValueChange).not.toHaveBeenCalled()
	})

	it("commits the active cell's staged edit when another cell of the same row is entered", () => {
		const { container, cell, onValueChange } = renderCellGrid()

		fireEvent.doubleClick(cell('name'))

		fireEvent.change(bySlot(container, 'grid-edit-input') as HTMLInputElement, {
			target: { value: 'Alicia' },
		})

		// Enter the sibling cell: the session moves there, committing the first
		// cell on the way out — the spreadsheet's click-elsewhere save.
		fireEvent.doubleClick(cell('count'))

		expect(onValueChange).toHaveBeenCalledTimes(1)

		expect(onValueChange).toHaveBeenCalledWith([{ rowKey: 1, columnId: 'name', value: 'Alicia' }])

		expect(bySlot(container, 'grid-edit-input')).toBeNull()

		expect(bySlot(container, 'grid-edit-number-input')).toHaveFocus()
	})

	it("commits the active cell's staged edit when a cell of another row is entered", () => {
		const { container, cell, onValueChange, onRowsChange } = renderCellGrid()

		fireEvent.doubleClick(cell('name', 0))

		fireEvent.change(bySlot(container, 'grid-edit-input') as HTMLInputElement, {
			target: { value: 'Alicia' },
		})

		fireEvent.doubleClick(cell('name', 1))

		expect(onValueChange).toHaveBeenCalledWith([{ rowKey: 1, columnId: 'name', value: 'Alicia' }])

		// One session at a time: the set swaps to the new row.
		expect(onRowsChange).toHaveBeenLastCalledWith(new Set([2]))

		expect((bySlot(container, 'grid-edit-input') as HTMLInputElement).value).toBe('Bob')
	})

	it("seats a consumer-driven session at the row's first editable column", () => {
		const onValueChange = vi.fn()

		function Harness() {
			const [editing, setEditing] = useState<Set<string | number>>(new Set())

			return (
				<>
					<button type="button" onClick={() => setEditing(new Set([1]))}>
						edit-1
					</button>
					<Grid
						columns={columns}
						rows={baseRows}
						getKey={(row) => row.id}
						editable={{ rows: editing, onRowsChange: setEditing, scope: 'cell', onValueChange }}
					/>
				</>
			)
		}

		const view = renderUI(<Harness />)

		fireEvent.click(view.getByRole('button', { name: 'edit-1' }))

		// A manual entry names no cell, so the session lands on the first editable
		// column — one editor, not a whole row of them.
		expect(bySlot(view.container, 'grid-edit-input')).toBeInTheDocument()

		expect(bySlot(view.container, 'grid-edit-number-input')).toBeNull()
	})
})

/**
 * Commit-and-move keys, on by default wherever the grid owns the session
 * (`trigger: 'doubleClick'`): Enter commits and moves the cursor down one row
 * (re-entering edit under `scope: 'cell'`); Tab / Shift+Tab commit and move
 * through the row's editable cells, wrapping at the edges (cell scope); F2
 * toggles edit on the cursor's cell; typing a printable character on the active
 * cell enters edit seeded with it, replacing the value.
 */
describe('Grid commit-and-move keys', () => {
	type Row = { id: number; name: string; count: number }

	const baseRows: Row[] = [
		{ id: 1, name: 'Alice', count: 2 },
		{ id: 2, name: 'Bob', count: 5 },
	]

	const columns: GridColumn<Row>[] = [
		{ id: 'name', title: 'Name', field: 'name', cell: (row) => row.name },
		{ id: 'count', title: 'Count', field: 'count', cell: (row) => String(row.count) },
	]

	function renderKeysGrid(
		cols: GridColumn<Row>[] = columns,
		scope: 'row' | 'cell' = 'cell',
		rows: Row[] = baseRows,
	) {
		const onValueChange = vi.fn()

		const view = renderUI(
			<Grid
				columns={cols}
				rows={rows}
				getKey={(row) => row.id}
				editable={{ trigger: 'doubleClick', scope, onValueChange }}
			/>,
		)

		return {
			...view,
			onValueChange,
			cell: (col: string, rowIndex = 0) =>
				view.container.querySelectorAll<HTMLElement>(`td[data-grid-col="${col}"]`)[
					rowIndex
				] as HTMLElement,
		}
	}

	it('re-enters edit on the next row after Enter under cell scope — the column-wise fill flow', () => {
		const { container, cell, onValueChange } = renderKeysGrid()

		fireEvent.doubleClick(cell('name', 0))

		const input = bySlot(container, 'grid-edit-input') as HTMLInputElement

		fireEvent.change(input, { target: { value: 'Alicia' } })

		fireEvent.keyDown(input, { key: 'Enter' })

		expect(onValueChange).toHaveBeenCalledWith([{ rowKey: 1, columnId: 'name', value: 'Alicia' }])

		// The session lands on the next row's cell in the same column, editing.
		const next = bySlot(container, 'grid-edit-input') as HTMLInputElement

		expect(next).toHaveFocus()

		expect(next.value).toBe('Bob')
	})

	it('commits without re-entering when Enter fires on the last row', () => {
		const { container, cell, onValueChange } = renderKeysGrid()

		fireEvent.doubleClick(cell('name', 1))

		const input = bySlot(container, 'grid-edit-input') as HTMLInputElement

		fireEvent.change(input, { target: { value: 'Bobby' } })

		fireEvent.keyDown(input, { key: 'Enter' })

		expect(onValueChange).toHaveBeenCalledWith([{ rowKey: 2, columnId: 'name', value: 'Bobby' }])

		expect(bySlot(container, 'grid-edit-input')).toBeNull()
	})

	it('commits and moves through the row on Tab, wrapping at the edges', () => {
		const { container, cell, onValueChange } = renderKeysGrid()

		fireEvent.doubleClick(cell('name', 0))

		const input = bySlot(container, 'grid-edit-input') as HTMLInputElement

		fireEvent.change(input, { target: { value: 'Alicia' } })

		fireEvent.keyDown(input, { key: 'Tab' })

		// The name cell committed; the session moved right to the count cell.
		expect(onValueChange).toHaveBeenCalledWith([{ rowKey: 1, columnId: 'name', value: 'Alicia' }])

		const counter = bySlot(container, 'grid-edit-number-input') as HTMLInputElement

		expect(counter).toHaveFocus()

		// Tab from the row's last editable cell wraps to its first.
		fireEvent.keyDown(counter, { key: 'Tab' })

		expect(bySlot(container, 'grid-edit-input')).toHaveFocus()
	})

	it('skips a readOnly column when Tab resolves the next editable cell', () => {
		const { container, cell } = renderKeysGrid([
			{ id: 'name', title: 'Name', field: 'name', cell: (row) => row.name },
			{ id: 'id', title: 'ID', cell: (row) => String(row.id), readOnly: true },
			{ id: 'count', title: 'Count', field: 'count', cell: (row) => String(row.count) },
		])

		fireEvent.doubleClick(cell('name', 0))

		fireEvent.keyDown(bySlot(container, 'grid-edit-input') as HTMLInputElement, { key: 'Tab' })

		expect(bySlot(container, 'grid-edit-number-input')).toHaveFocus()
	})

	it('moves backward on Shift+Tab', () => {
		const { container, cell } = renderKeysGrid()

		fireEvent.doubleClick(cell('count', 0))

		fireEvent.keyDown(bySlot(container, 'grid-edit-number-input') as HTMLInputElement, {
			key: 'Tab',
			shiftKey: true,
		})

		expect(bySlot(container, 'grid-edit-input')).toHaveFocus()
	})

	it('enters edit on F2 from the tab stop and commits in place on F2 from the editor', () => {
		const { container, getByRole, onValueChange } = renderKeysGrid()

		const grid = getByRole('grid')

		fireEvent.focus(grid)

		fireEvent.keyDown(grid, { key: 'F2' })

		const input = bySlot(container, 'grid-edit-input') as HTMLInputElement

		expect(input).toHaveFocus()

		fireEvent.change(input, { target: { value: 'Alicia' } })

		fireEvent.keyDown(input, { key: 'F2' })

		// The toggle off: committed in place, no session re-entry, focus back on
		// the tab stop.
		expect(onValueChange).toHaveBeenCalledWith([{ rowKey: 1, columnId: 'name', value: 'Alicia' }])

		expect(bySlot(container, 'grid-edit-input')).toBeNull()

		expect(grid).toHaveFocus()
	})

	it('enters edit seeded when a printable character is typed on the active cell', () => {
		const { container, getByRole, onValueChange } = renderKeysGrid()

		const grid = getByRole('grid')

		fireEvent.focus(grid)

		fireEvent.keyDown(grid, { key: 'Z' })

		// Typing replaces the value, as spreadsheets do.
		const input = bySlot(container, 'grid-edit-input') as HTMLInputElement

		expect(input).toHaveFocus()

		expect(input.value).toBe('Z')

		fireEvent.keyDown(input, { key: 'Enter' })

		expect(onValueChange).toHaveBeenCalledWith([{ rowKey: 1, columnId: 'name', value: 'Z' }])
	})

	it('seeds a number cell when a digit is typed, and enters unseeded otherwise', () => {
		const { container, getByRole } = renderKeysGrid([
			{ id: 'count', title: 'Count', field: 'count', cell: (row) => String(row.count) },
			{ id: 'name', title: 'Name', field: 'name', cell: (row) => row.name },
		])

		const grid = getByRole('grid')

		fireEvent.focus(grid)

		fireEvent.keyDown(grid, { key: '7' })

		expect((bySlot(container, 'grid-edit-number-input') as HTMLInputElement).value).toBe('7')
	})

	it('moves the cursor down a row after a row-scoped Enter commit, without re-entering', () => {
		const { container, cell, getByRole, onValueChange } = renderKeysGrid(columns, 'row')

		fireEvent.doubleClick(cell('name', 0))

		const input = bySlot(container, 'grid-edit-input') as HTMLInputElement

		fireEvent.change(input, { target: { value: 'Alicia' } })

		fireEvent.keyDown(input, { key: 'Enter' })

		expect(onValueChange).toHaveBeenCalledWith([{ rowKey: 1, columnId: 'name', value: 'Alicia' }])

		// No re-entry under row scope — the cursor just steps to the next row.
		expect(bySlot(container, 'grid-edit-input')).toBeNull()

		expect(getByRole('grid').getAttribute('aria-activedescendant')).toBe(cell('name', 1).id)
	})

	it('does not start an edit from typing inside a control', () => {
		const { container, cell } = renderKeysGrid()

		fireEvent.doubleClick(cell('name', 0))

		const input = bySlot(container, 'grid-edit-input') as HTMLInputElement

		// A character keyed inside the editor belongs to the editor; the grid must
		// not treat it as a typing-starts-edit entry for another cell.
		fireEvent.keyDown(input, { key: 'x' })

		expect(input).toHaveFocus()
	})
})

/**
 * The commit policy (`editable.commitOn`, default `['enter']`): `'blur'`
 * commits a cell-scoped session when its editor loses focus to elsewhere in
 * the grid, `'clickOutside'` commits every open session when focus leaves the
 * grid entirely, and omitting `'enter'` stands the commit keys down. Focus
 * landing in a floating overlay never reads as blur.
 */
describe('Grid commit policy (commitOn)', () => {
	type Row = { id: number; name: string; count: number }

	const baseRows: Row[] = [
		{ id: 1, name: 'Alice', count: 2 },
		{ id: 2, name: 'Bob', count: 5 },
	]

	const columns: GridColumn<Row>[] = [
		{ id: 'name', title: 'Name', field: 'name', cell: (row) => row.name },
		{ id: 'count', title: 'Count', field: 'count', cell: (row) => String(row.count) },
	]

	function renderPolicyGrid(commitOn?: ('enter' | 'blur' | 'clickOutside')[]) {
		const onValueChange = vi.fn()

		const view = renderUI(
			<>
				<button type="button">outside</button>
				<Grid
					columns={columns}
					rows={baseRows}
					getKey={(row) => row.id}
					editable={{ trigger: 'doubleClick', scope: 'cell', commitOn, onValueChange }}
				/>
			</>,
		)

		return {
			...view,
			onValueChange,
			outside: view.getByRole('button', { name: 'outside' }),
			cell: (col: string, rowIndex = 0) =>
				view.container.querySelectorAll<HTMLElement>(`td[data-grid-col="${col}"]`)[
					rowIndex
				] as HTMLElement,
		}
	}

	it('keeps the session and its draft on blur under the default policy', () => {
		const { container, cell, onValueChange } = renderPolicyGrid()

		fireEvent.doubleClick(cell('name'))

		const input = bySlot(container, 'grid-edit-input') as HTMLInputElement

		fireEvent.change(input, { target: { value: 'Alicia' } })

		fireEvent.blur(input, { relatedTarget: cell('count') })

		expect(bySlot(container, 'grid-edit-input')).toBeInTheDocument()

		expect(onValueChange).not.toHaveBeenCalled()
	})

	it("commits a cell-scoped session when its editor blurs to elsewhere in the grid under 'blur'", () => {
		const { container, cell, onValueChange } = renderPolicyGrid(['enter', 'blur'])

		fireEvent.doubleClick(cell('name'))

		const input = bySlot(container, 'grid-edit-input') as HTMLInputElement

		fireEvent.change(input, { target: { value: 'Alicia' } })

		fireEvent.blur(input, { relatedTarget: cell('count') })

		expect(onValueChange).toHaveBeenCalledWith([{ rowKey: 1, columnId: 'name', value: 'Alicia' }])

		expect(bySlot(container, 'grid-edit-input')).toBeNull()
	})

	it('never reads focus landing in a floating overlay as blur', () => {
		const { container, cell, onValueChange } = renderPolicyGrid(['enter', 'blur', 'clickOutside'])

		fireEvent.doubleClick(cell('name'))

		const input = bySlot(container, 'grid-edit-input') as HTMLInputElement

		fireEvent.change(input, { target: { value: 'Alicia' } })

		// A portaled panel opening from the editor (a DatePicker popover, a
		// listbox panel) pulls focus out of the table but must not end the session.
		const portal = document.createElement('div')

		portal.setAttribute('data-floating-ui-portal', '')

		const panelButton = document.createElement('button')

		portal.appendChild(panelButton)

		document.body.appendChild(portal)

		fireEvent.blur(input, { relatedTarget: panelButton })

		expect(bySlot(container, 'grid-edit-input')).toBeInTheDocument()

		expect(onValueChange).not.toHaveBeenCalled()

		portal.remove()
	})

	it("commits every open session when focus leaves the grid under 'clickOutside'", () => {
		const { container, cell, outside, onValueChange } = renderPolicyGrid(['enter', 'clickOutside'])

		fireEvent.doubleClick(cell('name'))

		const input = bySlot(container, 'grid-edit-input') as HTMLInputElement

		fireEvent.change(input, { target: { value: 'Alicia' } })

		fireEvent.blur(input, { relatedTarget: outside })

		expect(onValueChange).toHaveBeenCalledWith([{ rowKey: 1, columnId: 'name', value: 'Alicia' }])

		expect(bySlot(container, 'grid-edit-input')).toBeNull()
	})

	it("does not commit on leaving the grid when 'clickOutside' is not in the policy", () => {
		const { container, cell, outside, onValueChange } = renderPolicyGrid(['enter'])

		fireEvent.doubleClick(cell('name'))

		const input = bySlot(container, 'grid-edit-input') as HTMLInputElement

		fireEvent.change(input, { target: { value: 'Alicia' } })

		fireEvent.blur(input, { relatedTarget: outside })

		expect(bySlot(container, 'grid-edit-input')).toBeInTheDocument()

		expect(onValueChange).not.toHaveBeenCalled()
	})

	it("stands the commit keys down when 'enter' is absent from the policy", () => {
		const { container, cell, onValueChange } = renderPolicyGrid(['blur'])

		fireEvent.doubleClick(cell('name'))

		const input = bySlot(container, 'grid-edit-input') as HTMLInputElement

		fireEvent.change(input, { target: { value: 'Alicia' } })

		fireEvent.keyDown(input, { key: 'Enter' })

		// Enter no longer commits; the session (and its draft) stay open.
		expect(bySlot(container, 'grid-edit-input')).toBeInTheDocument()

		expect(onValueChange).not.toHaveBeenCalled()

		fireEvent.keyDown(input, { key: 'Tab' })

		expect(onValueChange).not.toHaveBeenCalled()
	})
})

/**
 * Async commit (`onValueChange` returning a Promise): the committed cells
 * render pending (`aria-busy` + shimmer) until the sink settles; a resolve
 * announces the save; declined cells — a resolved subset, or the whole batch
 * on a rejection — restore their drafts and re-enter edit with a per-cell
 * error on the validate surface.
 */
describe('Grid async commit', () => {
	type Row = { id: number; name: string; count: number }

	const baseRows: Row[] = [{ id: 1, name: 'Alice', count: 2 }]

	const columns: GridColumn<Row>[] = [
		{ id: 'name', title: 'Name', field: 'name', cell: (row) => row.name },
		{ id: 'count', title: 'Count', field: 'count', cell: (row) => String(row.count) },
	]

	function deferred<T>() {
		let resolve!: (value: T) => void

		let reject!: (reason?: unknown) => void

		const promise = new Promise<T>((res, rej) => {
			resolve = res

			reject = rej
		})

		return { promise, resolve, reject }
	}

	function renderAsyncGrid(onValueChange: (changes: unknown) => Promise<void | unknown[]>) {
		const view = renderUI(
			<Grid
				columns={columns}
				rows={baseRows}
				getKey={(row) => row.id}
				editable={{
					trigger: 'doubleClick',
					scope: 'cell',
					onValueChange: onValueChange as never,
				}}
			/>,
		)

		return {
			...view,
			cell: (col: string) =>
				view.container.querySelector(`td[data-grid-col="${col}"]`) as HTMLElement,
		}
	}

	it('renders the committed cell pending until the sink resolves, then announces the save', async () => {
		const gate = deferred<void>()

		const { container, cell } = renderAsyncGrid(() => gate.promise)

		fireEvent.doubleClick(cell('name'))

		const input = bySlot(container, 'grid-edit-input') as HTMLInputElement

		fireEvent.change(input, { target: { value: 'Alicia' } })

		fireEvent.keyDown(input, { key: 'Enter' })

		// The editor closed and the display content sits under the pending shroud
		// — programmatic (aria-busy) and visual — until the promise settles.
		expect(bySlot(container, 'grid-edit-input')).toBeNull()

		expect(container.querySelector('[aria-busy="true"]')).toBeInTheDocument()

		await act(async () => {
			gate.resolve()
		})

		expect(container.querySelector('[aria-busy="true"]')).toBeNull()

		expect(liveRegion()).toHaveTextContent('1 cell saved')
	})

	it('restores the draft and re-enters edit with the rejection message when the sink rejects', async () => {
		const gate = deferred<void>()

		const { container, cell } = renderAsyncGrid(() => gate.promise)

		fireEvent.doubleClick(cell('name'))

		fireEvent.change(bySlot(container, 'grid-edit-input') as HTMLInputElement, {
			target: { value: 'Alicia' },
		})

		fireEvent.keyDown(bySlot(container, 'grid-edit-input') as HTMLInputElement, { key: 'Enter' })

		await act(async () => {
			gate.reject(new Error('Duplicate name'))
		})

		// The cell is editing again, resumed from the rejected draft, carrying the
		// rejection on the validate error surface.
		const input = bySlot(container, 'grid-edit-input') as HTMLInputElement

		expect(input).toBeInTheDocument()

		expect(input.value).toBe('Alicia')

		expect(container.querySelector('[role="alert"]')).toHaveTextContent('Duplicate name')

		expect(liveRegion()).toHaveTextContent('1 cell could not be saved')

		// Editing the value resolves the rejection; the fresh draft gets its own
		// verdict at the next commit.
		fireEvent.change(input, { target: { value: 'Alice B' } })

		expect(container.querySelector('[role="alert"]')).toBeNull()
	})

	it('re-enters only the rejected subset when the sink resolves with one', async () => {
		const gate = deferred<unknown[]>()

		const rows: Row[] = [{ id: 1, name: 'Alice', count: 2 }]

		const view = renderUI(
			<Grid
				columns={columns}
				rows={rows}
				getKey={(row) => row.id}
				editable={{ trigger: 'doubleClick', onValueChange: (() => gate.promise) as never }}
			/>,
		)

		const cell = (col: string) =>
			view.container.querySelector(`td[data-grid-col="${col}"]`) as HTMLElement

		// Row scope: both cells edit and commit as one batch.
		fireEvent.doubleClick(cell('name'))

		fireEvent.change(bySlot(view.container, 'grid-edit-input') as HTMLInputElement, {
			target: { value: 'Alicia' },
		})

		fireEvent.change(bySlot(view.container, 'grid-edit-number-input') as HTMLInputElement, {
			target: { value: '9' },
		})

		fireEvent.keyDown(bySlot(view.container, 'grid-edit-input') as HTMLInputElement, {
			key: 'Enter',
		})

		expect(bySlot(view.container, 'grid-edit-input')).toBeNull()

		// The server declines only the count change.
		await act(async () => {
			gate.resolve([{ rowKey: 1, columnId: 'count', value: 9 }])
		})

		// The row re-enters edit; the declined cell resumes its draft and carries
		// the error, the accepted cell seeds clean from the row.
		expect((bySlot(view.container, 'grid-edit-number-input') as HTMLInputElement).value).toBe('9')

		expect(view.container.querySelector('[role="alert"]')).toHaveTextContent('Value was not saved')
	})
})
