import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { Grid, type GridColumn, type GridEditableConfig } from '../../modules/grid'
import { allBySlot, bySlot, expectAnnouncement, fireEvent, liveRegion, renderUI } from '../helpers'

type SessionRow = { id: number; name: string; count: number; done: boolean }

const sessionRows: SessionRow[] = [
	{ id: 1, name: 'Alice', count: 2, done: false },
	{ id: 2, name: 'Bob', count: 5, done: true },
]

const sessionColumns: GridColumn<SessionRow>[] = [
	{ id: 'name', title: 'Name', field: 'name', cell: (row) => row.name },
	{ id: 'count', title: 'Count', field: 'count', cell: (row) => String(row.count) },
]

/** The text and number editors mounted in the grid; the fixtures mount no other. */
function editorsIn(container: HTMLElement) {
	return [
		...allBySlot(container, 'grid-edit-input'),
		...allBySlot(container, 'grid-edit-number-input'),
	]
}

/**
 * Renders a grid over the spies the grid-owned suites assert on. `editable`
 * takes the scope under test and any per-case binding, and spreads last, so a
 * case can hand back the session by passing `trigger: 'manual'`. `cols` takes
 * the column shape a case needs. `rows` stays uncontrolled unless a case binds
 * it, so `onRowsChange` here reports the grid's own writes.
 */
function renderSessionGrid({
	editable,
	cols = sessionColumns,
}: {
	editable?: Partial<GridEditableConfig>
	cols?: GridColumn<SessionRow>[]
} = {}) {
	const onCommit = vi.fn()

	const onRowsChange = vi.fn()

	const view = renderUI(
		<Grid
			columns={cols}
			rows={sessionRows}
			getKey={(row) => row.id}
			editable={{ trigger: 'doubleClick', onRowsChange, onCommit, ...editable }}
		/>,
	)

	return {
		...view,
		onCommit,
		onRowsChange,
		cell: (col: string, rowIndex = 0) =>
			view.container.querySelectorAll<HTMLElement>(`td[data-grid-col="${col}"]`)[
				rowIndex
			] as HTMLElement,
	}
}

/**
 * Per-row inline editing baked into Grid: a row in the `editable` set puts all of
 * its editable cells into edit mode at once (the editor inferred from the value's
 * primitive type, or a column `editCell` slot). Edits stage live; removing the
 * row from the set saves its changed cells as one batch through `onCommit`,
 * and Escape reverts a cell.
 */
describe('Grid per-row editing', () => {
	// The `done` column adds the boolean editor this suite exercises; the two
	// data columns and the rows are the file's shared fixtures.
	const columns: GridColumn<SessionRow>[] = [
		...sessionColumns,
		{ id: 'done', title: 'Done', field: 'done', cell: (row) => (row.done ? 'Yes' : 'No') },
	]

	function renderGrid(cols: GridColumn<SessionRow>[] = columns) {
		const onCommit = vi.fn()

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
						rows={sessionRows}
						getKey={(row) => row.id}
						editable={{ rows: editing, onRowsChange: setEditing, onCommit }}
					/>
				</>
			)
		}

		const view = renderUI(<Harness />)

		return {
			...view,
			onCommit,
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
		const { container, editRow1, save, onCommit } = renderGrid()

		editRow1()

		fireEvent.change(bySlot(container, 'grid-edit-input') as HTMLInputElement, {
			target: { value: 'Alicia' },
		})

		save()

		expect(onCommit).toHaveBeenCalledTimes(1)

		expect(onCommit).toHaveBeenCalledWith([{ rowKey: 1, columnId: 'name', value: 'Alicia' }])
	})

	it('emits nothing when the row is saved with no changes', () => {
		const { editRow1, save, onCommit } = renderGrid()

		editRow1()

		save()

		expect(onCommit).not.toHaveBeenCalled()
	})

	it('reverts a cell on Escape and does not save it', () => {
		const { container, editRow1, save, onCommit } = renderGrid()

		editRow1()

		const input = bySlot(container, 'grid-edit-input') as HTMLInputElement

		fireEvent.change(input, { target: { value: 'Discarded' } })

		fireEvent.keyDown(input, { key: 'Escape' })

		// The editor stays open (the row is still editing) and resets to the value.
		expect((bySlot(container, 'grid-edit-input') as HTMLInputElement).value).toBe('Alice')

		save()

		expect(onCommit).not.toHaveBeenCalled()
	})

	it('uses a column editCell slot instead of the inferred editor', () => {
		const slotColumns: GridColumn<SessionRow>[] = [
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

		const { container, editRow1, save, onCommit } = renderGrid(slotColumns)

		editRow1()

		expect(bySlot(container, 'custom-edit')).toBeInTheDocument()

		expect(bySlot(container, 'grid-edit-input')).toBeNull()

		fireEvent.change(bySlot(container, 'custom-edit') as HTMLInputElement, {
			target: { value: 'Slotted' },
		})

		save()

		expect(onCommit).toHaveBeenCalledWith([{ rowKey: 1, columnId: 'name', value: 'Slotted' }])
	})

	it('shows a live validation error and skips an invalid cell on save', () => {
		const validatedColumns: GridColumn<SessionRow>[] = [
			{
				id: 'name',
				title: 'Name',
				field: 'name',
				cell: (row) => row.name,
				validate: (value) => (String(value).length > 0 ? null : 'Required'),
			},
		]

		const { container, editRow1, save, onCommit } = renderGrid(validatedColumns)

		editRow1()

		fireEvent.change(bySlot(container, 'grid-edit-input') as HTMLInputElement, {
			target: { value: '' },
		})

		expect(container.querySelector('[role="alert"]')).toHaveTextContent('Required')

		save()

		// The invalid cell is dropped, not emitted.
		expect(onCommit).not.toHaveBeenCalled()

		// A valid value saves.
		editRow1()

		fireEvent.change(bySlot(container, 'grid-edit-input') as HTMLInputElement, {
			target: { value: 'Fixed' },
		})

		save()

		expect(onCommit).toHaveBeenCalledWith([{ rowKey: 1, columnId: 'name', value: 'Fixed' }])
	})

	it('links the editor to its validation error for assistive tech', () => {
		const validatedColumns: GridColumn<SessionRow>[] = [
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

	it('drops a staged value for a column that locked while its editor was open', () => {
		const onCommit = vi.fn()

		function Harness() {
			const [locked, setLocked] = useState(false)

			const [editing, setEditing] = useState<Set<string | number>>(new Set([1]))

			return (
				<>
					<button type="button" onClick={() => setLocked(true)}>
						lock
					</button>
					<button type="button" onClick={() => setEditing(new Set())}>
						save
					</button>
					<Grid
						columns={[
							{ ...sessionColumns[0], readOnly: locked } as GridColumn<SessionRow>,
							sessionColumns[1] as GridColumn<SessionRow>,
						]}
						rows={sessionRows}
						getKey={(row) => row.id}
						editable={{ rows: editing, onRowsChange: setEditing, onCommit }}
					/>
				</>
			)
		}

		const view = renderUI(<Harness />)

		fireEvent.change(bySlot(view.container, 'grid-edit-input') as HTMLInputElement, {
			target: { value: 'Alicia' },
		})

		fireEvent.click(view.getByRole('button', { name: 'lock' }))

		fireEvent.click(view.getByRole('button', { name: 'save' }))

		// Locking closes the editor, so the value it held must not write either.
		// The mount gate and the commit gate answer to the same `readOnly`.
		expect(onCommit).not.toHaveBeenCalled()
	})

	it('announces nothing when the editing binding goes away with drafts staged', async () => {
		function Harness() {
			const [on, setOn] = useState(true)

			return (
				<>
					<button type="button" onClick={() => setOn(false)}>
						off
					</button>
					<Grid
						columns={sessionColumns}
						rows={sessionRows}
						getKey={(row) => row.id}
						editable={on ? { rows: new Set([1]), onCommit: vi.fn() } : undefined}
					/>
				</>
			)
		}

		const view = renderUI(<Harness />)

		fireEvent.change(bySlot(view.container, 'grid-edit-input') as HTMLInputElement, {
			target: { value: 'Alicia' },
		})

		fireEvent.click(view.getByRole('button', { name: 'off' }))

		await Promise.resolve()

		// The sink went with the binding, so nothing committed. Announcing a save
		// here would tell assistive tech something that did not happen.
		expect(liveRegion()?.textContent ?? '').not.toContain('cell updated')
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
	it("puts the row into edit mode on an editable cell double-click and focuses that cell's editor", () => {
		const { container, cell, onRowsChange } = renderSessionGrid()

		fireEvent.doubleClick(cell('name'))

		// The whole row edits (the per-row model), and the double-clicked cell's
		// editor takes focus.
		expect(bySlot(container, 'grid-edit-input')).toHaveFocus()

		expect(bySlot(container, 'grid-edit-number-input')).toBeInTheDocument()

		// The entry flows through the controllable set, so a bound consumer hears it.
		expect(onRowsChange).toHaveBeenCalledWith(new Set([1]))
	})

	it('ignores a double-click on a readOnly column', () => {
		const { container, cell } = renderSessionGrid({
			cols: [
				{ id: 'name', title: 'Name', field: 'name', cell: (row) => row.name },
				{
					id: 'count',
					title: 'Count',
					field: 'count',
					cell: (row) => String(row.count),
					readOnly: true,
				},
			],
		})

		fireEvent.doubleClick(cell('count'))

		expect(bySlot(container, 'grid-edit-input')).toBeNull()
	})

	it('saves the row as one batch on Enter and returns focus to the grid', () => {
		const { container, cell, onCommit, getByRole } = renderSessionGrid()

		fireEvent.doubleClick(cell('name'))

		const input = bySlot(container, 'grid-edit-input') as HTMLInputElement

		fireEvent.change(input, { target: { value: 'Alicia' } })

		fireEvent.keyDown(input, { key: 'Enter' })

		expect(onCommit).toHaveBeenCalledTimes(1)

		expect(onCommit).toHaveBeenCalledWith([{ rowKey: 1, columnId: 'name', value: 'Alicia' }])

		// The editors close and the keyboard lands back on the grid's tab stop.
		expect(bySlot(container, 'grid-edit-input')).toBeNull()

		expect(getByRole('grid')).toHaveFocus()
	})

	it("abandons the row's staged edits on Escape without emitting", () => {
		const { container, cell, onCommit } = renderSessionGrid()

		fireEvent.doubleClick(cell('name'))

		const input = bySlot(container, 'grid-edit-input') as HTMLInputElement

		fireEvent.change(input, { target: { value: 'Discarded' } })

		fireEvent.keyDown(input, { key: 'Escape' })

		expect(bySlot(container, 'grid-edit-input')).toBeNull()

		expect(onCommit).not.toHaveBeenCalled()

		// The drafts are dropped, not held: re-entering shows the row's value.
		fireEvent.doubleClick(cell('name'))

		expect((bySlot(container, 'grid-edit-input') as HTMLInputElement).value).toBe('Alice')
	})

	it("discards a number editor's value on Escape, past the stage its exit blur takes", () => {
		const { container, cell, onCommit } = renderSessionGrid()

		fireEvent.doubleClick(cell('count'))

		const number = bySlot(container, 'grid-edit-number-input') as HTMLInputElement

		fireEvent.change(number, { target: { value: '42' } })

		fireEvent.keyDown(number, { key: 'Escape' })

		// The exit reseats focus on the grid, and `NumberInput` commits its typed
		// text on that blur; the discard has to outlast that last stage.
		expect(onCommit).not.toHaveBeenCalled()
	})

	it("enters edit mode from the keyboard: Enter on the cursor's active cell", () => {
		const { container, getByRole } = renderSessionGrid()

		const grid = getByRole('grid')

		// Tab into the grid seeds the cursor on the first cell; Enter begins the edit.
		fireEvent.focus(grid)

		fireEvent.keyDown(grid, { key: 'Enter' })

		expect(bySlot(container, 'grid-edit-input')).toHaveFocus()
	})

	it('abandons the session on Escape from any editor, not just the inferred inputs', () => {
		const { container, cell, onCommit } = renderSessionGrid({
			cols: [
				{ id: 'name', title: 'Name', field: 'name', cell: (row) => row.name },
				{ id: 'done', title: 'Done', field: 'done', cell: (row) => (row.done ? 'Yes' : 'No') },
			],
		})

		fireEvent.doubleClick(cell('name'))

		// Escape from the (closed) boolean listbox abandons like from a text input:
		// the editing cell's host owns the key, not each editor.
		fireEvent.keyDown(bySlot(container, 'grid-edit-boolean-input') as HTMLElement, {
			key: 'Escape',
		})

		expect(bySlot(container, 'grid-edit-input')).toBeNull()

		expect(onCommit).not.toHaveBeenCalled()
	})

	it('abandons the session on Escape from anywhere in the grid, not only the editor', () => {
		const { container, cell, getByRole, onCommit } = renderSessionGrid()

		fireEvent.doubleClick(cell('name'))

		fireEvent.change(bySlot(container, 'grid-edit-input') as HTMLInputElement, {
			target: { value: 'Discarded' },
		})

		// Focus can leave the editor while its session runs — a Tab out and back, a
		// header control, a click on a row that is not editing. Escape has to reach
		// the session from there too, or it reads as dead while a draft stands.
		const grid = getByRole('grid')

		grid.focus()

		fireEvent.keyDown(grid, { key: 'Escape' })

		expect(bySlot(container, 'grid-edit-input')).toBeNull()

		expect(onCommit).not.toHaveBeenCalled()
	})

	it('defers Escape to an open floating surface inside the cell', () => {
		const { container, cell } = renderSessionGrid({
			cols: [
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
			],
		})

		fireEvent.doubleClick(cell('name'))

		// The press belongs to the open surface — its document-level escape layer
		// closes it after this handler — so the session stays alive.
		fireEvent.keyDown(bySlot(container, 'open-disclosure') as HTMLElement, { key: 'Escape' })

		expect(bySlot(container, 'open-disclosure')).toBeInTheDocument()
	})
})

/**
 * Cell-scoped sessions (`editable.scope: 'cell'`): a grid-owned session edits the
 * entered cell alone rather than its whole row. Moving to another cell commits
 * the one it leaves, so each `onCommit` carries a single change. Escape discards
 * only the cell the session sits on. The editable-row set and the batch
 * sink stay the model, so a consumer binding reads the same as under row scope.
 */
describe("Grid cell-scoped editing (scope: 'cell')", () => {
	const renderCellGrid = (editable: Partial<GridEditableConfig> = {}) =>
		renderSessionGrid({ editable: { scope: 'cell', ...editable } })

	it('mounts an editor in the entered cell alone, leaving the row it sits in reading', () => {
		const { container, cell } = renderCellGrid()

		fireEvent.doubleClick(cell('name'))

		expect(bySlot(container, 'grid-edit-input')).toHaveFocus()

		// The sibling cell of the same row keeps its display content — the one
		// difference from row scope, which mounts both editors at once.
		expect(bySlot(container, 'grid-edit-number-input')).toBeNull()
	})

	it('saves the entered cell on Enter, leaving its sibling unstaged and uncommitted', async () => {
		const { container, cell, onCommit, getByRole } = renderCellGrid()

		fireEvent.doubleClick(cell('name'))

		const input = bySlot(container, 'grid-edit-input') as HTMLInputElement

		fireEvent.change(input, { target: { value: 'Alicia' } })

		// The sibling cell has no editor to stage through, which is what makes this
		// batch one change. Under row scope it would have one, so a `scope` that
		// went unread could not pass here.
		expect(bySlot(container, 'grid-edit-number-input')).toBeNull()

		fireEvent.keyDown(input, { key: 'Enter' })

		expect(onCommit).toHaveBeenCalledTimes(1)

		expect(onCommit).toHaveBeenCalledWith([{ rowKey: 1, columnId: 'name', value: 'Alicia' }])

		expect(getByRole('grid')).toHaveFocus()

		await expectAnnouncement('1 cell updated')
	})

	it('commits the editors a narrowing closes together, in one batch', () => {
		const { container, cell, onCommit } = renderCellGrid({ defaultRows: new Set([1]) })

		// The row opened row-shaped, so both cells staged before any session ran.
		fireEvent.change(bySlot(container, 'grid-edit-input') as HTMLInputElement, {
			target: { value: 'Alicia' },
		})

		fireEvent.change(bySlot(container, 'grid-edit-number-input') as HTMLInputElement, {
			target: { value: '9' },
		})

		fireEvent.doubleClick(cell('name'))

		// Narrowing closes the count editor, so its value commits with the batch
		// rather than one change at a time. The docs promise the batch, not its
		// first entry.
		expect(onCommit).toHaveBeenCalledTimes(1)

		expect(onCommit).toHaveBeenCalledWith([{ rowKey: 1, columnId: 'count', value: 9 }])
	})

	it('commits the cell it leaves when the session moves along the row', () => {
		const { container, cell, onCommit, onRowsChange } = renderCellGrid()

		fireEvent.doubleClick(cell('name'))

		expect(onRowsChange).toHaveBeenCalledTimes(1)

		fireEvent.change(bySlot(container, 'grid-edit-input') as HTMLInputElement, {
			target: { value: 'Alicia' },
		})

		// The row never leaves the set, so the cell's own departure is what commits
		// it. That is the property keeping a cell-scoped batch one change long.
		fireEvent.doubleClick(cell('count'))

		expect(onCommit).toHaveBeenCalledTimes(1)

		expect(onCommit).toHaveBeenCalledWith([{ rowKey: 1, columnId: 'name', value: 'Alicia' }])

		// The set already holds the row, and the controllable emits on every write,
		// equal or not. Writing it again would report a transition that never
		// happened, and re-render a controlled consumer for nothing.
		expect(onRowsChange).toHaveBeenCalledTimes(1)

		expect(bySlot(container, 'grid-edit-input')).toBeNull()

		expect(bySlot(container, 'grid-edit-number-input')).toHaveFocus()
	})

	it('holds one row in the set, committing the row the session leaves', () => {
		const { container, cell, onCommit, onRowsChange } = renderCellGrid()

		fireEvent.doubleClick(cell('name'))

		fireEvent.change(bySlot(container, 'grid-edit-input') as HTMLInputElement, {
			target: { value: 'Alicia' },
		})

		fireEvent.doubleClick(cell('name', 1))

		expect(onCommit).toHaveBeenCalledWith([{ rowKey: 1, columnId: 'name', value: 'Alicia' }])

		// The first row leaves as the second enters, so the binding never carries a
		// row whose cells no longer edit.
		expect(onRowsChange).toHaveBeenLastCalledWith(new Set([2]))
	})

	it('abandons the active cell on Escape, keeping the cells committed before it', () => {
		const { container, cell, onCommit } = renderCellGrid()

		fireEvent.doubleClick(cell('name'))

		fireEvent.change(bySlot(container, 'grid-edit-input') as HTMLInputElement, {
			target: { value: 'Alicia' },
		})

		fireEvent.doubleClick(cell('count'))

		const number = bySlot(container, 'grid-edit-number-input') as HTMLInputElement

		fireEvent.change(number, { target: { value: '99' } })

		fireEvent.keyDown(number, { key: 'Escape' })

		// The name cell committed when the session left it; only the count cell —
		// the one Escape was pressed in — is discarded.
		expect(onCommit).toHaveBeenCalledTimes(1)

		expect(onCommit).toHaveBeenCalledWith([{ rowKey: 1, columnId: 'name', value: 'Alicia' }])

		expect(bySlot(container, 'grid-edit-number-input')).toBeNull()
	})

	it("enters one cell from the keyboard: Enter on the cursor's active cell", () => {
		const { container, getByRole } = renderCellGrid()

		const grid = getByRole('grid')

		fireEvent.focus(grid)

		fireEvent.keyDown(grid, { key: 'Enter' })

		expect(bySlot(container, 'grid-edit-input')).toHaveFocus()

		expect(bySlot(container, 'grid-edit-number-input')).toBeNull()
	})

	it('narrows a row the consumer opened, rather than declining the entry', () => {
		const { container, cell } = renderSessionGrid({
			editable: { scope: 'cell', rows: new Set([1]) },
		})

		// The consumer's own binding opens the row, so its cells all mount — the
		// row-shaped state a session has not narrowed yet.
		expect(bySlot(container, 'grid-edit-number-input')).toBeInTheDocument()

		fireEvent.doubleClick(cell('name'))

		// Entering is not a no-op just because that row already edits: no session
		// held this cell, so the double-click starts one and narrows to it.
		expect(bySlot(container, 'grid-edit-input')).toHaveFocus()

		expect(bySlot(container, 'grid-edit-number-input')).toBeNull()
	})

	it('narrows its own row only, leaving a consumer-opened sibling whole', () => {
		function Harness() {
			const [editing, setEditing] = useState<Set<string | number>>(new Set())

			return (
				<>
					<button type="button" onClick={() => setEditing((prev) => new Set(prev).add(2))}>
						edit-2
					</button>
					<Grid
						columns={sessionColumns}
						rows={sessionRows}
						getKey={(row) => row.id}
						editable={{
							trigger: 'doubleClick',
							scope: 'cell',
							rows: editing,
							onRowsChange: setEditing,
							onCommit: vi.fn(),
						}}
					/>
				</>
			)
		}

		const view = renderUI(<Harness />)

		fireEvent.doubleClick(
			view.container.querySelectorAll('td[data-grid-col="name"]')[0] as HTMLElement,
		)

		expect(editorsIn(view.container)).toHaveLength(1)

		fireEvent.click(view.getByRole('button', { name: 'edit-2' }))

		// The session holds row 1 and narrows that row alone. Row 2 came from the
		// consumer's binding, which names rows and never cells, so it opens whole.
		expect(editorsIn(view.container)).toHaveLength(3)
	})

	it('widens the narrowed row when scope leaves cell mid-session', () => {
		function Harness() {
			const [scope, setScope] = useState<'row' | 'cell'>('cell')

			return (
				<>
					<button type="button" onClick={() => setScope('row')}>
						widen
					</button>
					<Grid
						columns={sessionColumns}
						rows={sessionRows}
						getKey={(row) => row.id}
						editable={{ trigger: 'doubleClick', scope, onCommit: vi.fn() }}
					/>
				</>
			)
		}

		const view = renderUI(<Harness />)

		fireEvent.doubleClick(
			view.container.querySelectorAll('td[data-grid-col="name"]')[0] as HTMLElement,
		)

		expect(editorsIn(view.container)).toHaveLength(1)

		fireEvent.click(view.getByRole('button', { name: 'widen' }))

		// The coord was written under a scope that no longer holds, so it strands
		// with the config. Outliving it would pin the row at one cell.
		expect(editorsIn(view.container)).toHaveLength(2)
	})

	it('hands back a row it borrowed, and closes one it acquired', () => {
		// Row 1 was the consumer's before any session touched it. Narrowing borrows
		// it; moving to row 2 gives it back row-shaped rather than closing it.
		const borrowed = renderCellGrid({ defaultRows: new Set([1]) })

		fireEvent.doubleClick(borrowed.cell('name', 0))

		fireEvent.doubleClick(borrowed.cell('name', 1))

		expect(allBySlot(borrowed.container, 'grid-edit-input')).toHaveLength(2)

		borrowed.unmount()

		// A row the session put in the set itself is the session's to close.
		const acquired = renderCellGrid()

		fireEvent.doubleClick(acquired.cell('name', 0))

		fireEvent.doubleClick(acquired.cell('name', 1))

		expect(allBySlot(acquired.container, 'grid-edit-input')).toHaveLength(1)
	})

	it('still releases an acquired row after the session moved within it', () => {
		const { cell, onRowsChange } = renderCellGrid()

		fireEvent.doubleClick(cell('name', 0))

		// A move inside the held row must not relearn how the row was come by: the
		// set already holds it, because this session put it there.
		fireEvent.doubleClick(cell('count', 0))

		fireEvent.doubleClick(cell('name', 1))

		expect(onRowsChange).toHaveBeenLastCalledWith(new Set([2]))
	})

	it('does not revive a session the consumer ended from under it', () => {
		function Harness() {
			const [editing, setEditing] = useState<Set<string | number>>(new Set())

			return (
				<>
					<button type="button" onClick={() => setEditing(new Set())}>
						withdraw
					</button>
					<button type="button" onClick={() => setEditing(new Set([1]))}>
						re-add
					</button>
					<Grid
						columns={sessionColumns}
						rows={sessionRows}
						getKey={(row) => row.id}
						editable={{
							trigger: 'doubleClick',
							scope: 'cell',
							rows: editing,
							onRowsChange: setEditing,
							onCommit: vi.fn(),
						}}
					/>
				</>
			)
		}

		const view = renderUI(<Harness />)

		fireEvent.doubleClick(view.container.querySelector('td[data-grid-col="name"]') as HTMLElement)

		expect(bySlot(view.container, 'grid-edit-input')).toBeInTheDocument()

		fireEvent.click(view.getByRole('button', { name: 'withdraw' }))

		fireEvent.click(view.getByRole('button', { name: 're-add' }))

		// Nobody entered a cell this time, so the re-added row is a plain
		// consumer-driven edit and every editable cell mounts. A session coord kept
		// past its row would revive here and open one cell instead.
		expect([
			...allBySlot(view.container, 'grid-edit-input'),
			...allBySlot(view.container, 'grid-edit-number-input'),
		]).toHaveLength(2)
	})

	it('falls back to the row under a consumer-owned session, which names no cell', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

		// `scope` narrows a grid-owned session. Under 'manual' the consumer flips a
		// row and the grid never learns a cell, so the row's editors all mount.
		const { container } = renderSessionGrid({
			editable: { trigger: 'manual', scope: 'cell', rows: new Set([1]) },
		})

		expect(bySlot(container, 'grid-edit-input')).toBeInTheDocument()

		expect(bySlot(container, 'grid-edit-number-input')).toBeInTheDocument()

		// Inert rather than wrong, so it fails silently — which is what the
		// development warning is for.
		expect(warn).toHaveBeenCalledWith(expect.stringContaining("editable.scope: 'cell'"))
	})
})
