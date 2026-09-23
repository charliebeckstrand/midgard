import { type ReactNode, useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import {
	Grid,
	type GridCellRef,
	type GridColumn,
	type GridEditableConfig,
	type GridProps,
} from '../../modules/grid'
import {
	allBySlot,
	bySlot,
	expectAnnouncement,
	fireEvent,
	getSlot,
	liveRegion,
	present,
	renderUI,
} from '../helpers'

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
 * case can hand back the session by passing `session: 'manual'`. `cols` takes
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
			editable={{ session: 'managed', onRowsChange, onCommit, ...editable }}
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

		fireEvent.change(getSlot<HTMLInputElement>(container, 'grid-edit-input'), {
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

		const input = getSlot<HTMLInputElement>(container, 'grid-edit-input')

		fireEvent.change(input, { target: { value: 'Discarded' } })

		fireEvent.keyDown(input, { key: 'Escape' })

		// The editor stays open (the row is still editing) and resets to the value.
		expect(getSlot<HTMLInputElement>(container, 'grid-edit-input').value).toBe('Alice')

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

		fireEvent.change(getSlot<HTMLInputElement>(container, 'custom-edit'), {
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

		fireEvent.change(getSlot<HTMLInputElement>(container, 'grid-edit-input'), {
			target: { value: '' },
		})

		expect(container.querySelector('[role="alert"]')).toHaveTextContent('Required')

		save()

		// The invalid cell is dropped, not emitted.
		expect(onCommit).not.toHaveBeenCalled()

		// A valid value saves.
		editRow1()

		fireEvent.change(getSlot<HTMLInputElement>(container, 'grid-edit-input'), {
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

		const input = getSlot<HTMLInputElement>(container, 'grid-edit-input')

		fireEvent.change(input, { target: { value: '' } })

		const alert = present(container.querySelector('[role="alert"]'), '[role="alert"]')

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

		fireEvent.change(getSlot<HTMLInputElement>(container, 'grid-edit-input'), {
			target: { value: 'Alicia' },
		})

		save()

		// The announcer sets its region on a microtask; flush it rather than waiting,
		// so the grid's debounced row-count status doesn't fire mid-test.
		await Promise.resolve()

		expect(liveRegion()).toHaveTextContent('1 cell updated')
	})

	/**
	 * Stages one edit, disturbs the grid while its editor is open, then saves.
	 * The four cases below differ only in what the disturbance changes, so
	 * `gridProps` takes the disturbed flag and returns that difference; the
	 * pagination case moves the view rather than a prop, and drives its own
	 * control instead of the `disturb` button.
	 */
	function renderStagedEdit(gridProps: (disturbed: boolean) => Partial<GridProps<SessionRow>>) {
		const onCommit = vi.fn()

		function Harness() {
			const [disturbed, setDisturbed] = useState(false)

			const [editing, setEditing] = useState<Set<string | number>>(new Set([1]))

			return (
				<>
					<button type="button" onClick={() => setDisturbed(true)}>
						disturb
					</button>
					<button type="button" onClick={() => setEditing(new Set())}>
						save
					</button>
					<Grid
						columns={sessionColumns as GridColumn<SessionRow>[]}
						rows={sessionRows}
						getKey={(row) => row.id}
						editable={{ rows: editing, onRowsChange: setEditing, onCommit }}
						{...gridProps(disturbed)}
					/>
				</>
			)
		}

		const view = renderUI(<Harness />)

		fireEvent.change(getSlot<HTMLInputElement>(view.container, 'grid-edit-input'), {
			target: { value: 'Alicia' },
		})

		const click = (name: string) => fireEvent.click(view.getByRole('button', { name }))

		return { ...view, onCommit, click, disturb: () => click('disturb'), save: () => click('save') }
	}

	/** The one change every committing case above expects on the sink. */
	const NAME_EDIT = [{ rowKey: 1, columnId: 'name', value: 'Alicia' }]

	it('drops a staged value for a column that locked while its editor was open', () => {
		const { onCommit, disturb, save } = renderStagedEdit((locked) => ({
			columns: [
				{ ...sessionColumns[0], readOnly: locked } as GridColumn<SessionRow>,
				sessionColumns[1] as GridColumn<SessionRow>,
			],
		}))

		disturb()

		save()

		// Locking closes the editor, so the value it held must not write either.
		// The mount gate and the commit gate answer to the same `readOnly`.
		expect(onCommit).not.toHaveBeenCalled()
	})

	it('commits a staged value for a column that hid while its editor was open', () => {
		const { onCommit, disturb, save } = renderStagedEdit((hidden) => ({
			columnManager: { hidden: hidden ? new Set(['name']) : new Set() },
		}))

		disturb()

		save()

		// A hidden column is a view state, not a lock: the value the user typed
		// still belongs to the row. The commit path reads the grid's own columns,
		// so it finds the one the window stopped rendering.
		expect(onCommit).toHaveBeenCalledWith(NAME_EDIT)
	})

	it('commits a staged value for a row the window dropped while its editor was open', () => {
		const { onCommit, click, save } = renderStagedEdit(() => ({
			pagination: { defaultValue: { pageIndex: 0, pageSize: 1 } },
		}))

		click('Next page')

		save()

		// The row left the page, not the data. Its key still resolves against the
		// `rows` the consumer passed, so the edit reaches the sink.
		expect(onCommit).toHaveBeenCalledWith(NAME_EDIT)
	})

	it('drops a staged value for a row the consumer removed while its editor was open', () => {
		const { onCommit, disturb, save } = renderStagedEdit((removed) => ({
			rows: removed ? [sessionRows[1] as SessionRow] : sessionRows,
		}))

		disturb()

		save()

		// The counterpart to the two above: a row the consumer really took out is
		// absent from `rows` as well, so its draft has nothing to write to.
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

		fireEvent.change(getSlot<HTMLInputElement>(view.container, 'grid-edit-input'), {
			target: { value: 'Alicia' },
		})

		fireEvent.click(view.getByRole('button', { name: 'off' }))

		await Promise.resolve()

		// The sink went with the binding, so nothing committed. Announcing a save
		// here would tell assistive tech something that did not happen.
		expect(liveRegion()?.textContent ?? '').not.toContain('cell updated')
	})

	it('lets a row action discard a row without committing it', () => {
		const onCommit = vi.fn()

		function Harness() {
			const [editing, setEditing] = useState<Set<string | number>>(new Set([1]))

			return (
				<Grid
					columns={[
						...sessionColumns,
						{
							id: 'actions',
							actions: (_row, ctx) => (
								<>
									<button type="button" onClick={ctx.save}>
										save-row
									</button>
									<button type="button" onClick={ctx.discard}>
										discard-row
									</button>
									<span data-slot="editing-flag">{String(ctx.editing)}</span>
								</>
							),
						},
					]}
					rows={sessionRows}
					getKey={(row) => row.id}
					editable={{ rows: editing, onRowsChange: setEditing, onCommit }}
				/>
			)
		}

		const view = renderUI(<Harness />)

		// The slot is told which rows edit, so it needs no state of its own.
		expect(bySlot(view.container, 'editing-flag')).toHaveTextContent('true')

		fireEvent.change(getSlot<HTMLInputElement>(view.container, 'grid-edit-input'), {
			target: { value: 'Discarded' },
		})

		fireEvent.click(view.getAllByRole('button', { name: 'discard-row' })[0] as HTMLElement)

		// Removing a row from the set is a save, so this transition has no
		// consumer-driven equivalent — it is the whole reason the slot has it.
		expect(onCommit).not.toHaveBeenCalled()

		expect(bySlot(view.container, 'grid-edit-input')).toBeNull()
	})

	it('lets a row action save the row it acts on', () => {
		const onCommit = vi.fn()

		function Harness() {
			const [editing, setEditing] = useState<Set<string | number>>(new Set([1]))

			return (
				<Grid
					columns={[
						...sessionColumns,
						{
							id: 'actions',
							actions: (_row, ctx) => (
								<button type="button" onClick={ctx.save}>
									save-row
								</button>
							),
						},
					]}
					rows={sessionRows}
					getKey={(row) => row.id}
					editable={{ rows: editing, onRowsChange: setEditing, onCommit }}
				/>
			)
		}

		const view = renderUI(<Harness />)

		fireEvent.change(getSlot<HTMLInputElement>(view.container, 'grid-edit-input'), {
			target: { value: 'Alicia' },
		})

		fireEvent.click(view.getAllByRole('button', { name: 'save-row' })[0] as HTMLElement)

		expect(onCommit).toHaveBeenCalledWith([{ rowKey: 1, columnId: 'name', value: 'Alicia' }])
	})

	describe('focus after an exit while focus is in another grid', () => {
		/** Grid A edits row 1 and carries a save action for it. */
		function GridA({ detail }: { detail?: (row: SessionRow) => ReactNode }) {
			const [editing, setEditing] = useState<Set<string | number>>(new Set([1]))

			return (
				<Grid
					tableProps={{ 'aria-label': 'Grid A' }}
					columns={[
						...sessionColumns,
						{
							id: 'actions',
							actions: (_row, ctx) => (
								<button type="button" onClick={ctx.save}>
									save-a
								</button>
							),
						},
					]}
					rows={sessionRows}
					getKey={(row) => row.id}
					editable={{ rows: editing, onRowsChange: setEditing, onCommit: vi.fn() }}
					expandable={detail ? { defaultValue: new Set([1]), render: detail } : undefined}
				/>
			)
		}

		/** Grid B edits row 1, so its editor can hold focus. */
		function GridB() {
			return (
				<Grid
					tableProps={{ 'aria-label': 'Grid B' }}
					columns={sessionColumns}
					rows={sessionRows}
					getKey={(row) => row.id}
					editable={{ rows: new Set([1]), onCommit: vi.fn() }}
				/>
			)
		}

		/** Focuses grid B's first editor, then ends grid A's session. */
		function exitAWithFocusInB(view: ReturnType<typeof renderUI>) {
			const gridB = view.getByRole('grid', { name: 'Grid B' })

			const editorB = getSlot<HTMLInputElement>(gridB, 'grid-edit-input')

			editorB.focus()

			fireEvent.click(view.getAllByRole('button', { name: 'save-a' })[0] as HTMLElement)

			return editorB
		}

		it('keeps focus in a sibling grid', () => {
			const view = renderUI(
				<>
					<GridA />
					<GridB />
				</>,
			)

			const editorB = exitAWithFocusInB(view)

			expect(document.activeElement).toBe(editorB)
		})

		it('keeps focus in a grid nested in a detail row', () => {
			const view = renderUI(<GridA detail={() => <GridB />} />)

			const editorB = exitAWithFocusInB(view)

			expect(document.activeElement).toBe(editorB)
		})
	})

	it('reports no editing to an actions column on a grid with no editable binding', () => {
		const view = renderUI(
			<Grid
				columns={[
					...sessionColumns,
					{
						id: 'actions',
						actions: (_row, ctx) => <span data-slot="editing-flag">{String(ctx.editing)}</span>,
					},
				]}
				rows={sessionRows}
				getKey={(row) => row.id}
			/>,
		)

		// The slot renders in every grid, so it must be answerable without one.
		expect(bySlot(view.container, 'editing-flag')).toHaveTextContent('false')
	})

	it('leaves Enter alone under a consumer-owned session, where Escape reverts a cell', () => {
		const { container, editRow1, save, onCommit } = renderGrid()

		editRow1()

		const input = getSlot<HTMLInputElement>(container, 'grid-edit-input')

		fireEvent.change(input, { target: { value: 'Alicia' } })

		fireEvent.keyDown(input, { key: 'Enter' })

		// Enter belongs to a grid-owned session and to nothing else. Here the
		// consumer owns entry and exit, so the row stays open and nothing commits
		// until they say so — and Escape still reverts the cell rather than the row.
		expect(bySlot(container, 'grid-edit-input')).toBeInTheDocument()

		expect(onCommit).not.toHaveBeenCalled()

		save()

		expect(onCommit).toHaveBeenCalledWith([{ rowKey: 1, columnId: 'name', value: 'Alicia' }])
	})

	it('does not enter edit mode on a cell double-click in the default manual mode', () => {
		const { container } = renderGrid()

		fireEvent.doubleClick(
			present(container.querySelector('td[data-grid-col="name"]'), 'td[data-grid-col="name"]'),
		)

		expect(bySlot(container, 'grid-edit-input')).toBeNull()
	})
})

/**
 * Grid-owned edit sessions (`editable.session: 'managed'`): double-clicking
 * an editable data cell — through the grid's built-in cell double-click event —
 * or pressing Enter on the keyboard cursor's active cell puts its row into edit
 * mode and focuses that cell's editor; an editor's Enter saves the row as the
 * usual one-batch commit and Escape abandons its staged edits, focus returning
 * to the grid's tab stop either way. Entry and exit flow through the same
 * controllable set, so `onRowsChange` reports every transition.
 */
describe("Grid double-click-to-edit (session: 'managed')", () => {
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

	it.each(['row', 'cell'] as const)(
		'drops the focus of an entry that a controlled rows binding declines, under %s scope',
		(scope) => {
			function Harness() {
				const [editing, setEditing] = useState<Set<string | number>>(new Set())

				return (
					<>
						<button type="button" onClick={() => setEditing(new Set([1]))}>
							open-1
						</button>
						<Grid
							columns={sessionColumns}
							rows={sessionRows}
							getKey={(row) => row.id}
							// A binding that declines every entry the grid asks for.
							editable={{ session: 'managed', scope, rows: editing, onCommit: vi.fn() }}
						/>
					</>
				)
			}

			const view = renderUI(<Harness />)

			const grid = view.getByRole('grid')

			fireEvent.focus(grid)

			// F2 enters the cursor's cell. It moves no cursor, so the grid renders
			// again only if the entry itself makes it.
			fireEvent.keyDown(grid, { key: 'F2' })

			expect(editorsIn(view.container)).toHaveLength(0)

			// The consumer opens the row later, for its own reason. The declined entry
			// must not take focus now.
			fireEvent.click(view.getByRole('button', { name: 'open-1' }))

			expect(editorsIn(view.container)).not.toHaveLength(0)

			for (const editor of editorsIn(view.container)) expect(editor).not.toHaveFocus()
		},
	)

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

		const input = getSlot<HTMLInputElement>(container, 'grid-edit-input')

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

		const input = getSlot<HTMLInputElement>(container, 'grid-edit-input')

		fireEvent.change(input, { target: { value: 'Discarded' } })

		fireEvent.keyDown(input, { key: 'Escape' })

		expect(bySlot(container, 'grid-edit-input')).toBeNull()

		expect(onCommit).not.toHaveBeenCalled()

		// The drafts are dropped, not held: re-entering shows the row's value.
		fireEvent.doubleClick(cell('name'))

		expect(getSlot<HTMLInputElement>(container, 'grid-edit-input').value).toBe('Alice')
	})

	it("discards a number editor's value on Escape, past the stage its exit blur takes", () => {
		const { container, cell, onCommit } = renderSessionGrid()

		fireEvent.doubleClick(cell('count'))

		const number = getSlot<HTMLInputElement>(container, 'grid-edit-number-input')

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
		fireEvent.keyDown(getSlot(container, 'grid-edit-boolean-input'), {
			key: 'Escape',
		})

		expect(bySlot(container, 'grid-edit-input')).toBeNull()

		expect(onCommit).not.toHaveBeenCalled()
	})

	it('abandons the session on Escape from anywhere in the grid, not only the editor', () => {
		const { container, cell, getByRole, onCommit } = renderSessionGrid()

		fireEvent.doubleClick(cell('name'))

		fireEvent.change(getSlot<HTMLInputElement>(container, 'grid-edit-input'), {
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

	it("saves the row on Enter from an editCell slot's own input", () => {
		const { container, cell, onCommit } = renderSessionGrid({
			cols: [
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
			],
		})

		fireEvent.doubleClick(cell('name'))

		const input = getSlot<HTMLInputElement>(container, 'custom-edit')

		fireEvent.change(input, { target: { value: 'Slotted' } })

		// Enter lives on the table's key surface, as Escape does, so a slot inherits
		// it with no wiring and no call to `ctx.commit`.
		fireEvent.keyDown(input, { key: 'Enter' })

		expect(onCommit).toHaveBeenCalledExactlyOnceWith([
			{ rowKey: 1, columnId: 'name', value: 'Slotted' },
		])
	})

	it('leaves Enter to a button inside an editor, such as the listbox trigger', () => {
		const { container, cell, onCommit } = renderSessionGrid({
			cols: [
				{ id: 'name', title: 'Name', field: 'name', cell: (row) => row.name },
				{ id: 'done', title: 'Done', field: 'done', cell: (row) => (row.done ? 'Yes' : 'No') },
			],
		})

		fireEvent.doubleClick(cell('name'))

		fireEvent.keyDown(getSlot(container, 'listbox-button'), { key: 'Enter' })

		// A button activates on its own Enter; the listbox opens on it. Saving here
		// would take the one key the listbox has to open with.
		expect(bySlot(container, 'grid-edit-boolean-input')).toBeInTheDocument()

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
		fireEvent.keyDown(getSlot(container, 'open-disclosure'), { key: 'Escape' })

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

		const input = getSlot<HTMLInputElement>(container, 'grid-edit-input')

		fireEvent.change(input, { target: { value: 'Alicia' } })

		// The sibling cell has no editor to stage through, which is what makes this
		// batch one change. Under row scope it would have one, so a `scope` that
		// went unread could not pass here.
		expect(bySlot(container, 'grid-edit-number-input')).toBeNull()

		fireEvent.keyDown(input, { key: 'Enter' })

		expect(onCommit).toHaveBeenCalledTimes(1)

		expect(onCommit).toHaveBeenCalledWith([{ rowKey: 1, columnId: 'name', value: 'Alicia' }])

		// Enter commits and moves down, so the session re-enters the same column
		// one row below rather than handing focus back to the grid.
		expect(getByRole('grid')).toHaveAttribute('aria-activedescendant', cell('name', 1).id)

		await expectAnnouncement('1 cell updated')
	})

	it('commits the editors a narrowing closes together, in one batch', () => {
		const { container, cell, onCommit } = renderCellGrid({ defaultRows: new Set([1]) })

		// The row opened row-shaped, so both cells staged before any session ran.
		fireEvent.change(getSlot<HTMLInputElement>(container, 'grid-edit-input'), {
			target: { value: 'Alicia' },
		})

		fireEvent.change(getSlot<HTMLInputElement>(container, 'grid-edit-number-input'), {
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

		fireEvent.change(getSlot<HTMLInputElement>(container, 'grid-edit-input'), {
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

	it('re-renders only the cell a move along the row leaves, not the window', () => {
		const display = vi.fn((row: SessionRow, col: 'name' | 'count') => String(row[col]))

		const { cell } = renderSessionGrid({
			editable: { scope: 'cell' },
			cols: [
				{ id: 'name', title: 'Name', field: 'name', cell: (row) => display(row, 'name') },
				{ id: 'count', title: 'Count', field: 'count', cell: (row) => display(row, 'count') },
			],
		})

		fireEvent.doubleClick(cell('name'))

		display.mockClear()

		fireEvent.doubleClick(cell('count'))

		// The cell the session left reads again, and the one it entered mounts an
		// editor, which calls no display renderer. Every other cell keeps its
		// render: the session's cell rides a store each cell subscribes to, not
		// the context the whole window reads.
		expect(display).toHaveBeenCalledExactlyOnceWith(sessionRows[0], 'name')
	})

	it('holds one row in the set, committing the row the session leaves', () => {
		const { container, cell, onCommit, onRowsChange } = renderCellGrid()

		fireEvent.doubleClick(cell('name'))

		fireEvent.change(getSlot<HTMLInputElement>(container, 'grid-edit-input'), {
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

		fireEvent.change(getSlot<HTMLInputElement>(container, 'grid-edit-input'), {
			target: { value: 'Alicia' },
		})

		fireEvent.doubleClick(cell('count'))

		const number = getSlot<HTMLInputElement>(container, 'grid-edit-number-input')

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
							session: 'managed',
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
						editable={{ session: 'managed', scope, onCommit: vi.fn() }}
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
							session: 'managed',
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
			present(view.container.querySelector('td[data-grid-col="name"]'), 'td[data-grid-col="name"]'),
		)

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

	it('keeps the held cell when a controlled rows binding declines a move to another row', () => {
		const onCommit = vi.fn()

		const onCellChange = vi.fn()

		function Harness() {
			const [editing, setEditing] = useState<Set<string | number>>(new Set())

			return (
				<Grid
					columns={sessionColumns}
					rows={sessionRows}
					getKey={(row) => row.id}
					editable={{
						session: 'managed',
						scope: 'cell',
						rows: editing,
						// A guard that lets no second row open.
						onRowsChange: (next) => {
							if (!next.has(2)) setEditing(next)
						},
						onCellChange,
						onCommit,
					}}
				/>
			)
		}

		const view = renderUI(<Harness />)

		const names = view.container.querySelectorAll<HTMLElement>('td[data-grid-col="name"]')

		fireEvent.doubleClick(present(names[0], 'the first name cell'))

		const input = getSlot<HTMLInputElement>(view.container, 'grid-edit-input')

		fireEvent.change(input, { target: { value: 'Alicia' } })

		fireEvent.doubleClick(present(names[1], 'the second name cell'))

		// The move changed nothing: the held cell keeps its editor and its draft,
		// and its row stays narrowed to it.
		expect(editorsIn(view.container)).toEqual([input])

		expect(input.value).toBe('Alicia')

		expect(onCommit).not.toHaveBeenCalled()

		// The grid reported the move before the rows write, so it reports the
		// return to the held cell.
		expect(onCellChange).toHaveBeenLastCalledWith({ rowKey: 1, columnId: 'name' })

		// The session still holds its row, so Escape from the tab stop reaches it.
		fireEvent.keyDown(view.getByRole('grid'), { key: 'Escape' })

		expect(editorsIn(view.container)).toHaveLength(0)

		expect(onCommit).not.toHaveBeenCalled()
	})

	it('falls back to the row under a consumer-owned session, which names no cell', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

		// `scope` narrows a grid-owned session. Under 'manual' the consumer flips a
		// row and the grid never learns a cell, so the row's editors all mount.
		const { container } = renderSessionGrid({
			editable: { session: 'manual', scope: 'cell', rows: new Set([1]) },
		})

		expect(bySlot(container, 'grid-edit-input')).toBeInTheDocument()

		expect(bySlot(container, 'grid-edit-number-input')).toBeInTheDocument()

		// Inert rather than wrong, so it fails silently — which is what the
		// development warning is for.
		expect(warn).toHaveBeenCalledWith(expect.stringContaining("editable.scope: 'cell'"))
	})
})

/**
 * Commit-and-move keys under a grid-owned session: Enter commits and moves down,
 * Tab and Shift+Tab commit and move along the row's editable cells, F2 toggles
 * edit on the cursor's cell, and a printable key on the tab stop enters edit
 * seeded with that character. The keys ride the table's key surface, so the
 * focus moves they cause are asserted here only as far as jsdom shows them.
 */
describe('Grid commit-and-move keys', () => {
	// A read-only column between the two editable ones, so Tab has one to skip.
	const keyColumns: GridColumn<SessionRow>[] = [
		{ id: 'name', title: 'Name', field: 'name', cell: (row) => row.name },
		{ id: 'id', title: 'ID', field: 'id', cell: (row) => String(row.id), readOnly: true },
		{ id: 'count', title: 'Count', field: 'count', cell: (row) => String(row.count) },
	]

	const renderKeysGrid = (editable: Partial<GridEditableConfig> = {}) =>
		renderSessionGrid({ editable: { scope: 'cell', ...editable }, cols: keyColumns })

	/** The cell the cursor sits on, as `aria-activedescendant` names it. */
	const cursorOn = (view: ReturnType<typeof renderKeysGrid>) =>
		view.getByRole('grid').getAttribute('aria-activedescendant')

	it('commits the cell on Enter and enters the same column one row down', () => {
		const view = renderKeysGrid()

		fireEvent.doubleClick(view.cell('name'))

		const input = getSlot<HTMLInputElement>(view.container, 'grid-edit-input')

		fireEvent.change(input, { target: { value: 'Alicia' } })

		fireEvent.keyDown(input, { key: 'Enter' })

		expect(view.onCommit).toHaveBeenCalledExactlyOnceWith([
			{ rowKey: 1, columnId: 'name', value: 'Alicia' },
		])

		expect(cursorOn(view)).toBe(view.cell('name', 1).id)

		const next = getSlot<HTMLInputElement>(view.container, 'grid-edit-input')

		expect(next.value).toBe('Bob')

		expect(next).toHaveFocus()
	})

	it('commits on Enter from the last row and leaves the cursor there', () => {
		const view = renderKeysGrid()

		fireEvent.doubleClick(view.cell('name', 1))

		const input = getSlot<HTMLInputElement>(view.container, 'grid-edit-input')

		fireEvent.change(input, { target: { value: 'Robert' } })

		fireEvent.keyDown(input, { key: 'Enter' })

		expect(view.onCommit).toHaveBeenCalledWith([{ rowKey: 2, columnId: 'name', value: 'Robert' }])

		// There is no row below, so the session ends where it was rather than
		// re-entering the cell it just committed.
		expect(editorsIn(view.container)).toHaveLength(0)

		expect(cursorOn(view)).toBe(view.cell('name', 1).id)

		expect(view.getByRole('grid')).toHaveFocus()
	})

	it('saves the row on Enter under row scope and moves the cursor down without entering', () => {
		const view = renderKeysGrid({ scope: 'row' })

		fireEvent.doubleClick(view.cell('count'))

		const number = getSlot<HTMLInputElement>(view.container, 'grid-edit-number-input')

		fireEvent.change(number, { target: { value: '7' } })

		fireEvent.keyDown(number, { key: 'Enter' })

		expect(view.onCommit).toHaveBeenCalledWith([{ rowKey: 1, columnId: 'count', value: 7 }])

		// Row scope opens a record, not a column, so the move lands the cursor only.
		expect(editorsIn(view.container)).toHaveLength(0)

		expect(cursorOn(view)).toBe(view.cell('count', 1).id)

		expect(view.getByRole('grid')).toHaveFocus()
	})

	it('commits on Tab and enters the next editable cell, skipping a read-only one', () => {
		const view = renderKeysGrid()

		fireEvent.doubleClick(view.cell('name'))

		const input = getSlot<HTMLInputElement>(view.container, 'grid-edit-input')

		fireEvent.change(input, { target: { value: 'Alicia' } })

		fireEvent.keyDown(input, { key: 'Tab' })

		expect(view.onCommit).toHaveBeenCalledExactlyOnceWith([
			{ rowKey: 1, columnId: 'name', value: 'Alicia' },
		])

		expect(bySlot(view.container, 'grid-edit-number-input')).toHaveFocus()

		expect(cursorOn(view)).toBe(view.cell('count').id)
	})

	it('wraps Tab and Shift+Tab at the edges of the row', () => {
		const view = renderKeysGrid()

		fireEvent.doubleClick(view.cell('name'))

		// Shift+Tab from the first editable cell wraps to the last.
		fireEvent.keyDown(getSlot(view.container, 'grid-edit-input'), { key: 'Tab', shiftKey: true })

		expect(bySlot(view.container, 'grid-edit-number-input')).toHaveFocus()

		// Tab from the last wraps back to the first, on the same row.
		fireEvent.keyDown(getSlot(view.container, 'grid-edit-number-input'), { key: 'Tab' })

		expect(bySlot(view.container, 'grid-edit-input')).toHaveFocus()

		expect(cursorOn(view)).toBe(view.cell('name').id)
	})

	it('commits on Tab where the row has no other editable cell', () => {
		const view = renderSessionGrid({
			editable: { scope: 'cell' },
			cols: [keyColumns[0] as GridColumn<SessionRow>, keyColumns[1] as GridColumn<SessionRow>],
		})

		fireEvent.doubleClick(view.cell('name'))

		const input = getSlot<HTMLInputElement>(view.container, 'grid-edit-input')

		fireEvent.change(input, { target: { value: 'Alicia' } })

		fireEvent.keyDown(input, { key: 'Tab' })

		// A Tab with nowhere to go would otherwise leave the grid with the draft
		// staged and the editor open behind it.
		expect(view.onCommit).toHaveBeenCalledWith([{ rowKey: 1, columnId: 'name', value: 'Alicia' }])

		expect(view.getByRole('grid')).toHaveFocus()
	})

	it('moves focus on Tab under row scope without committing the row', () => {
		const view = renderKeysGrid({ scope: 'row' })

		fireEvent.doubleClick(view.cell('name'))

		const input = getSlot<HTMLInputElement>(view.container, 'grid-edit-input')

		fireEvent.change(input, { target: { value: 'Alicia' } })

		fireEvent.keyDown(input, { key: 'Tab' })

		// Every editor of the row is open, so Tab walks them and the row commits
		// when it closes, as one batch.
		expect(bySlot(view.container, 'grid-edit-number-input')).toHaveFocus()

		expect(view.onCommit).not.toHaveBeenCalled()
	})

	it('toggles edit on the cursor cell with F2', () => {
		const view = renderKeysGrid()

		const grid = view.getByRole('grid')

		fireEvent.focus(grid)

		fireEvent.keyDown(grid, { key: 'F2' })

		const input = getSlot<HTMLInputElement>(view.container, 'grid-edit-input')

		expect(input).toHaveFocus()

		fireEvent.change(input, { target: { value: 'Alicia' } })

		fireEvent.keyDown(input, { key: 'F2' })

		expect(view.onCommit).toHaveBeenCalledWith([{ rowKey: 1, columnId: 'name', value: 'Alicia' }])

		expect(grid).toHaveFocus()

		expect(cursorOn(view)).toBe(view.cell('name').id)
	})

	it('enters edit on a printable key, seeded with that character', () => {
		const view = renderKeysGrid()

		const grid = view.getByRole('grid')

		fireEvent.focus(grid)

		fireEvent.keyDown(grid, { key: 'x' })

		const input = getSlot<HTMLInputElement>(view.container, 'grid-edit-input')

		// The character replaces the value, as a spreadsheet does, and the caret
		// sits after it so the next key extends it.
		expect(input.value).toBe('x')

		expect(input).toHaveFocus()

		expect(input.selectionStart).toBe(1)

		fireEvent.keyDown(input, { key: 'Enter' })

		expect(view.onCommit).toHaveBeenCalledWith([{ rowKey: 1, columnId: 'name', value: 'x' }])
	})

	it('seeds a number cell with a digit and ignores a letter there', () => {
		const view = renderKeysGrid()

		const grid = view.getByRole('grid')

		fireEvent.focus(grid)

		fireEvent.keyDown(grid, { key: 'ArrowRight' })

		fireEvent.keyDown(grid, { key: 'ArrowRight' })

		fireEvent.keyDown(grid, { key: 'q' })

		expect(editorsIn(view.container)).toHaveLength(0)

		fireEvent.keyDown(grid, { key: '4' })

		expect(getSlot<HTMLInputElement>(view.container, 'grid-edit-number-input').value).toBe('4')
	})

	it.each([
		['Ctrl', { ctrlKey: true }],
		['Cmd', { metaKey: true }],
		['Alt', { altKey: true }],
		['an input method', { keyCode: 229 }],
		['a composing input method', { isComposing: true }],
	])('does not seed a letter pressed with %s', (_, modifier) => {
		const view = renderKeysGrid()

		const grid = view.getByRole('grid')

		fireEvent.focus(grid)

		fireEvent.keyDown(grid, { key: 'c', ...modifier })

		expect(editorsIn(view.container)).toHaveLength(0)
	})

	it('does not seed on Space, which stays with the cursor', () => {
		const view = renderKeysGrid()

		const grid = view.getByRole('grid')

		fireEvent.focus(grid)

		fireEvent.keyDown(grid, { key: ' ' })

		expect(editorsIn(view.container)).toHaveLength(0)
	})

	it('does not seed a yes/no cell or an editCell slot, which F2 still opens', () => {
		const view = renderSessionGrid({
			editable: { scope: 'cell' },
			cols: [
				{ id: 'done', title: 'Done', field: 'done', cell: (row) => (row.done ? 'Yes' : 'No') },
				{
					id: 'name',
					title: 'Name',
					field: 'name',
					cell: (row) => row.name,
					editCell: () => <input data-slot="custom-edit" />,
				},
			],
		})

		const grid = view.getByRole('grid')

		fireEvent.focus(grid)

		fireEvent.keyDown(grid, { key: 'y' })

		expect(bySlot(view.container, 'grid-edit-boolean-input')).toBeNull()

		fireEvent.keyDown(grid, { key: 'ArrowRight' })

		fireEvent.keyDown(grid, { key: 'y' })

		expect(bySlot(view.container, 'custom-edit')).toBeNull()

		fireEvent.keyDown(grid, { key: 'F2' })

		expect(bySlot(view.container, 'custom-edit')).toHaveFocus()
	})

	it('leaves Enter to an input method that composes it', () => {
		const view = renderKeysGrid()

		fireEvent.doubleClick(view.cell('name'))

		const input = getSlot<HTMLInputElement>(view.container, 'grid-edit-input')

		fireEvent.keyDown(input, { key: 'Enter', isComposing: true })

		// The Enter confirms the composed text; the session stays where it is.
		expect(bySlot(view.container, 'grid-edit-input')).toBe(input)

		expect(view.onCommit).not.toHaveBeenCalled()
	})

	it('leaves Tab and Enter to an open floating surface in the cell', () => {
		const view = renderSessionGrid({
			editable: { scope: 'cell' },
			cols: [
				{
					id: 'name',
					title: 'Name',
					field: 'name',
					cell: (row) => row.name,
					editCell: () => <input data-slot="open-combobox" role="combobox" aria-expanded="true" />,
				},
				keyColumns[2] as GridColumn<SessionRow>,
			],
		})

		fireEvent.doubleClick(view.cell('name'))

		const surface = getSlot(view.container, 'open-combobox')

		fireEvent.keyDown(surface, { key: 'Tab' })

		fireEvent.keyDown(surface, { key: 'Enter' })

		// Both presses belong to the open panel, which picks or closes with them.
		expect(bySlot(view.container, 'open-combobox')).toBeInTheDocument()

		expect(bySlot(view.container, 'grid-edit-number-input')).toBeNull()
	})

	it('keeps the commit and lands the cursor when a binding declines the entry below', () => {
		const onCommit = vi.fn()

		function Harness() {
			const [editing, setEditing] = useState<Set<string | number>>(new Set())

			return (
				<Grid
					columns={keyColumns}
					rows={sessionRows}
					getKey={(row) => row.id}
					editable={{
						session: 'managed',
						scope: 'cell',
						rows: editing,
						// A guard that lets rows close but lets no second row open.
						onRowsChange: (next) => {
							if (!next.has(2)) setEditing(next)
						},
						onCommit,
					}}
				/>
			)
		}

		const view = renderUI(<Harness />)

		fireEvent.doubleClick(
			view.container.querySelectorAll('td[data-grid-col="name"]')[0] as HTMLElement,
		)

		const input = getSlot<HTMLInputElement>(view.container, 'grid-edit-input')

		fireEvent.change(input, { target: { value: 'Alicia' } })

		fireEvent.keyDown(input, { key: 'Enter' })

		expect(onCommit).toHaveBeenCalledWith([{ rowKey: 1, columnId: 'name', value: 'Alicia' }])

		expect(editorsIn(view.container)).toHaveLength(0)

		expect(view.getByRole('grid')).toHaveFocus()
	})

	it('stays inert under a consumer-owned session', () => {
		const view = renderKeysGrid({ session: 'manual', scope: 'row' })

		const grid = view.getByRole('grid')

		fireEvent.focus(grid)

		fireEvent.keyDown(grid, { key: 'F2' })

		fireEvent.keyDown(grid, { key: 'x' })

		expect(editorsIn(view.container)).toHaveLength(0)
	})
})

/**
 * The active-cell binding of a cell-scoped session: `cell`,
 * `defaultCell`, and `onCellChange`. A controlled binding decides
 * each move; the grid enters a cell the consumer names, and reports each cell it
 * enters. `rows` keeps its meaning beside it.
 */
describe('Grid active-cell binding', () => {
	const keyColumns: GridColumn<SessionRow>[] = [
		{ id: 'name', title: 'Name', field: 'name', cell: (row) => row.name },
		{ id: 'id', title: 'ID', field: 'id', cell: (row) => String(row.id), readOnly: true },
		{ id: 'count', title: 'Count', field: 'count', cell: (row) => String(row.count) },
	]

	type Cell = GridCellRef | null

	/**
	 * A grid whose active cell is controlled. `accept` decides whether the
	 * harness applies a move the grid asks for; each button sets the cell from
	 * outside. `rows` stays uncontrolled unless `controlRows` binds it.
	 */
	function renderControlled({
		accept = () => true,
		initial = null,
		acceptRows,
	}: {
		accept?: (cell: Cell) => boolean
		initial?: Cell
		acceptRows?: (rows: Set<string | number>) => boolean
	} = {}) {
		const onCommit = vi.fn()

		const onRowsChange = vi.fn()

		const onCellChange = vi.fn()

		function Harness() {
			const [active, setActive] = useState<Cell>(initial)

			const [rows, setRows] = useState<Set<string | number>>(new Set())

			const rowsBinding = acceptRows
				? {
						rows,
						onRowsChange: (next: Set<string | number>) => {
							onRowsChange(next)

							if (acceptRows(next)) setRows(next)
						},
					}
				: { onRowsChange }

			return (
				<>
					<button type="button" onClick={() => setActive({ rowKey: 2, columnId: 'name' })}>
						row-2-name
					</button>
					<button type="button" onClick={() => setActive({ rowKey: 1, columnId: 'count' })}>
						row-1-count
					</button>
					<button type="button" onClick={() => setActive({ rowKey: 1, columnId: 'id' })}>
						row-1-id
					</button>
					<button type="button" onClick={() => setActive({ rowKey: 99, columnId: 'name' })}>
						row-99-name
					</button>
					<button type="button" onClick={() => setActive(null)}>
						clear
					</button>
					<Grid
						columns={keyColumns}
						rows={sessionRows}
						getKey={(row) => row.id}
						editable={{
							session: 'managed',
							scope: 'cell',
							onCommit,
							...rowsBinding,
							cell: active,
							onCellChange: (next) => {
								onCellChange(next)

								if (accept(next)) setActive(next)
							},
						}}
					/>
				</>
			)
		}

		const view = renderUI(<Harness />)

		return {
			...view,
			onCommit,
			onRowsChange,
			onCellChange,
			press: (name: string) => fireEvent.click(view.getByRole('button', { name })),
			cell: (col: string, rowIndex = 0) =>
				view.container.querySelectorAll<HTMLElement>(`td[data-grid-col="${col}"]`)[
					rowIndex
				] as HTMLElement,
		}
	}

	it('keeps the held cell open and uncommitted when a controlled binding declines a move', () => {
		const view = renderControlled({ accept: (cell) => cell?.columnId !== 'count' })

		fireEvent.doubleClick(view.cell('name'))

		const input = getSlot<HTMLInputElement>(view.container, 'grid-edit-input')

		fireEvent.change(input, { target: { value: 'Alicia' } })

		fireEvent.doubleClick(view.cell('count'))

		expect(view.onCellChange).toHaveBeenLastCalledWith({ rowKey: 1, columnId: 'count' })

		// The binding kept the name cell, so its editor stays mounted with the
		// typed value, and nothing commits.
		expect(bySlot(view.container, 'grid-edit-input')).toBe(input)

		expect(input.value).toBe('Alicia')

		expect(bySlot(view.container, 'grid-edit-number-input')).toBeNull()

		expect(view.onCommit).not.toHaveBeenCalled()
	})

	it('keeps the held row open when a controlled binding declines a move to another row', () => {
		const view = renderControlled({ accept: (cell) => cell?.rowKey !== 2 })

		fireEvent.doubleClick(view.cell('name'))

		expect(view.onRowsChange).toHaveBeenCalledTimes(1)

		fireEvent.doubleClick(view.cell('name', 1))

		// The rows write waits for the active cell. A declined move writes neither.
		expect(view.onRowsChange).toHaveBeenCalledTimes(1)

		expect(editorsIn(view.container)).toHaveLength(1)

		expect(view.onCommit).not.toHaveBeenCalled()
	})

	it('enters a cell set from outside, committing the held cell and opening the new row', () => {
		const view = renderControlled()

		fireEvent.doubleClick(view.cell('name'))

		fireEvent.change(getSlot<HTMLInputElement>(view.container, 'grid-edit-input'), {
			target: { value: 'Alicia' },
		})

		view.press('row-2-name')

		expect(view.onCommit).toHaveBeenCalledExactlyOnceWith([
			{ rowKey: 1, columnId: 'name', value: 'Alicia' },
		])

		expect(view.onRowsChange).toHaveBeenLastCalledWith(new Set([2]))

		const input = getSlot<HTMLInputElement>(view.container, 'grid-edit-input')

		expect(input.value).toBe('Bob')

		expect(editorsIn(view.container)).toHaveLength(1)

		// The consumer set the cell, so the grid does not report it back.
		expect(view.onCellChange).toHaveBeenCalledTimes(1)
	})

	it('writes no rows for a cell set from outside in the row the session holds', () => {
		const view = renderControlled()

		fireEvent.doubleClick(view.cell('name'))

		fireEvent.change(getSlot<HTMLInputElement>(view.container, 'grid-edit-input'), {
			target: { value: 'Alicia' },
		})

		view.press('row-1-count')

		expect(view.onRowsChange).toHaveBeenCalledTimes(1)

		expect(view.onCommit).toHaveBeenCalledExactlyOnceWith([
			{ rowKey: 1, columnId: 'name', value: 'Alicia' },
		])

		expect(bySlot(view.container, 'grid-edit-input')).toBeNull()

		expect(bySlot(view.container, 'grid-edit-number-input')).toBeInTheDocument()
	})

	it('ends the session and commits the held cell when the binding clears to null', () => {
		const view = renderControlled()

		fireEvent.doubleClick(view.cell('name'))

		fireEvent.change(getSlot<HTMLInputElement>(view.container, 'grid-edit-input'), {
			target: { value: 'Alicia' },
		})

		view.press('clear')

		expect(view.onCommit).toHaveBeenCalledExactlyOnceWith([
			{ rowKey: 1, columnId: 'name', value: 'Alicia' },
		])

		expect(editorsIn(view.container)).toHaveLength(0)

		expect(view.onRowsChange).toHaveBeenLastCalledWith(new Set())
	})

	it('reports Tab and Enter moves in order, and a controlled binding follows them', () => {
		const view = renderControlled()

		fireEvent.doubleClick(view.cell('name'))

		fireEvent.keyDown(getSlot(view.container, 'grid-edit-input'), { key: 'Tab' })

		const number = getSlot<HTMLInputElement>(view.container, 'grid-edit-number-input')

		expect(number).toHaveFocus()

		fireEvent.change(number, { target: { value: '9' } })

		fireEvent.keyDown(number, { key: 'Enter' })

		// Enter is an exit and an entry, so it reports both.
		expect(view.onCellChange.mock.calls).toEqual([
			[{ rowKey: 1, columnId: 'name' }],
			[{ rowKey: 1, columnId: 'count' }],
			[null],
			[{ rowKey: 2, columnId: 'count' }],
		])

		expect(view.onCommit).toHaveBeenCalledExactlyOnceWith([
			{ rowKey: 1, columnId: 'count', value: 9 },
		])

		const next = getSlot<HTMLInputElement>(view.container, 'grid-edit-number-input')

		expect(next.value).toBe('5')

		expect(next).toHaveFocus()

		expect(view.onRowsChange).toHaveBeenLastCalledWith(new Set([2]))
	})

	it('reports the active cell before the rows write that opens its row', () => {
		const log: string[] = []

		renderSessionGrid({
			editable: {
				scope: 'cell',
				onRowsChange: () => log.push('rows'),
				onCellChange: () => log.push('cell'),
			},
		})

		fireEvent.doubleClick(
			present(document.querySelector('td[data-grid-col="name"]'), 'td[data-grid-col="name"]'),
		)

		expect(log).toEqual(['cell', 'rows'])
	})

	it('reports each cell an uncontrolled session enters and leaves', () => {
		const onCellChange = vi.fn()

		const view = renderSessionGrid({ editable: { scope: 'cell', onCellChange } })

		fireEvent.doubleClick(view.cell('name'))

		fireEvent.doubleClick(view.cell('count'))

		fireEvent.keyDown(getSlot(view.container, 'grid-edit-number-input'), { key: 'Escape' })

		expect(onCellChange.mock.calls).toEqual([
			[{ rowKey: 1, columnId: 'name' }],
			[{ rowKey: 1, columnId: 'count' }],
			[null],
		])
	})

	it('opens a default active cell on mount, reporting nothing', () => {
		const onCellChange = vi.fn()

		const view = renderSessionGrid({
			editable: {
				scope: 'cell',
				defaultCell: { rowKey: 2, columnId: 'name' },
				onCellChange,
			},
		})

		const input = getSlot<HTMLInputElement>(view.container, 'grid-edit-input')

		expect(input.value).toBe('Bob')

		expect(editorsIn(view.container)).toHaveLength(1)

		expect(input).not.toHaveFocus()

		expect(view.onRowsChange).not.toHaveBeenCalled()

		expect(onCellChange).not.toHaveBeenCalled()
	})

	it('warns once and stays inert outside a cell-scoped grid-owned session', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

		const onCellChange = vi.fn()

		const view = renderSessionGrid({
			editable: {
				scope: 'row',
				cell: { rowKey: 1, columnId: 'name' },
				onCellChange,
			},
		})

		// The binding names no cell under row scope, so no editor mounts for it.
		expect(editorsIn(view.container)).toHaveLength(0)

		fireEvent.doubleClick(view.cell('name'))

		expect(onCellChange).not.toHaveBeenCalled()

		expect(warn).toHaveBeenCalledWith(expect.stringContaining('editable.cell'))

		warn.mockRestore()
	})

	it('reads a cell that is not editable as null, renders no editor, and warns', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

		const view = renderControlled()

		view.press('row-1-id')

		expect(editorsIn(view.container)).toHaveLength(0)

		view.press('row-99-name')

		expect(editorsIn(view.container)).toHaveLength(0)

		expect(view.onRowsChange).not.toHaveBeenCalled()

		expect(warn).toHaveBeenCalledOnce()

		expect(warn).toHaveBeenCalledWith(expect.stringContaining('editable.cell'))

		warn.mockRestore()
	})

	it('does not take focus for a cell set from outside while focus is outside the grid', () => {
		const view = renderControlled()

		const button = view.getByRole('button', { name: 'row-2-name' })

		button.focus()

		fireEvent.click(button)

		expect(getSlot(view.container, 'grid-edit-input')).not.toHaveFocus()

		expect(button).toHaveFocus()
	})

	it('moves focus into the entered editor while focus is inside the grid', () => {
		const view = renderControlled()

		fireEvent.doubleClick(view.cell('name'))

		expect(getSlot(view.container, 'grid-edit-input')).toHaveFocus()

		// The press arrives by a route that leaves focus in the editor, as a
		// consumer's keyboard shortcut does.
		view.press('row-2-name')

		const input = getSlot<HTMLInputElement>(view.container, 'grid-edit-input')

		expect(input.value).toBe('Bob')

		expect(input).toHaveFocus()
	})

	it('keeps the cell and its focus when a controlled binding declines a Tab move', () => {
		const view = renderControlled({ accept: (cell) => cell?.columnId !== 'count' })

		fireEvent.doubleClick(view.cell('name'))

		const input = getSlot<HTMLInputElement>(view.container, 'grid-edit-input')

		fireEvent.change(input, { target: { value: 'Alicia' } })

		fireEvent.keyDown(input, { key: 'Tab' })

		// The move asked for the count cell and was declined. The name cell holds,
		// with focus still in its editor, and nothing commits.
		expect(bySlot(view.container, 'grid-edit-input')).toBe(input)

		expect(input).toHaveFocus()

		expect(view.onCommit).not.toHaveBeenCalled()
	})

	it('keeps the commit of an Enter whose entry below a controlled binding declines', () => {
		const view = renderControlled({ accept: (cell) => cell?.rowKey !== 2 })

		fireEvent.doubleClick(view.cell('name'))

		const input = getSlot<HTMLInputElement>(view.container, 'grid-edit-input')

		fireEvent.change(input, { target: { value: 'Alicia' } })

		fireEvent.keyDown(input, { key: 'Enter' })

		// Enter is two writes: the exit, then the entry. The binding applied the
		// exit and declined the entry, so the commit stands and no editor opens.
		expect(view.onCommit).toHaveBeenCalledExactlyOnceWith([
			{ rowKey: 1, columnId: 'name', value: 'Alicia' },
		])

		expect(editorsIn(view.container)).toHaveLength(0)

		expect(view.getByRole('grid')).toHaveFocus()
	})

	it('re-renders only the two cells a controlled move along the row touches', () => {
		const display = vi.fn((row: SessionRow, col: 'name' | 'count') => String(row[col]))

		// Stable across the consumer's renders, as a real consumer's columns are.
		const columns: GridColumn<SessionRow>[] = [
			{ id: 'name', title: 'Name', field: 'name', cell: (row) => display(row, 'name') },
			{ id: 'count', title: 'Count', field: 'count', cell: (row) => display(row, 'count') },
		]

		function Harness() {
			const [active, setActive] = useState<GridCellRef | null>(null)

			return (
				<Grid
					columns={columns}
					rows={sessionRows}
					getKey={(row) => row.id}
					editable={{
						session: 'managed',
						scope: 'cell',
						onCommit: vi.fn(),
						cell: active,
						onCellChange: setActive,
					}}
				/>
			)
		}

		const view = renderUI(<Harness />)

		const cells = view.container.querySelectorAll<HTMLElement>('td[data-grid-col]')

		fireEvent.doubleClick(present(cells[0], 'the name cell'))

		display.mockClear()

		fireEvent.doubleClick(present(cells[1], 'the count cell'))

		// The consumer's render reaches the grid, but the cells read the session's
		// cell from the store, so only the cell the move left reads again.
		expect(display).toHaveBeenCalledExactlyOnceWith(sessionRows[0], 'name')
	})

	it('reads the cell as null when a controlled rows binding declines its row', () => {
		const view = renderControlled({ acceptRows: (rows) => !rows.has(2) })

		fireEvent.doubleClick(view.cell('name', 1))

		// The active cell went first and was applied; the rows write that follows
		// was declined, so no editor opens and nothing reports the strand.
		expect(view.onCellChange).toHaveBeenCalledExactlyOnceWith({ rowKey: 2, columnId: 'name' })

		expect(view.onRowsChange).toHaveBeenCalledOnce()

		expect(editorsIn(view.container)).toHaveLength(0)
	})

	it('keeps the held cell narrowed when a controlled rows binding declines a move to another row', () => {
		const view = renderControlled({ acceptRows: (rows) => !rows.has(2) })

		fireEvent.doubleClick(view.cell('name'))

		const input = getSlot<HTMLInputElement>(view.container, 'grid-edit-input')

		fireEvent.change(input, { target: { value: 'Alicia' } })

		fireEvent.doubleClick(view.cell('name', 1))

		// The binding applied the cell and declined its row. The held cell keeps
		// its editor and its draft, and its row stays narrowed to it.
		expect(view.onCellChange).toHaveBeenLastCalledWith({ rowKey: 2, columnId: 'name' })

		expect(editorsIn(view.container)).toEqual([input])

		expect(input.value).toBe('Alicia')

		expect(view.onCommit).not.toHaveBeenCalled()

		// The session still holds its row, so Escape from the tab stop reaches it.
		fireEvent.keyDown(view.getByRole('grid'), { key: 'Escape' })

		expect(editorsIn(view.container)).toHaveLength(0)

		expect(view.onCommit).not.toHaveBeenCalled()
	})
})

describe('Grid editing onReject', () => {
	const requiredName: GridColumn<SessionRow>[] = [
		{
			id: 'name',
			title: 'Name',
			field: 'name',
			cell: (row) => row.name,
			validate: (value) => (String(value).length > 0 ? null : 'Required'),
		},
	]

	function renderGrid(cols: GridColumn<SessionRow>[] = requiredName) {
		const onCommit = vi.fn()

		const onReject = vi.fn()

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
						editable={{ rows: editing, onRowsChange: setEditing, onCommit, onReject }}
					/>
				</>
			)
		}

		const view = renderUI(<Harness />)

		return {
			...view,
			onCommit,
			onReject,
			editRow1: () => fireEvent.click(view.getByRole('button', { name: 'edit-1' })),
			save: () => fireEvent.click(view.getByRole('button', { name: 'save' })),
		}
	}

	// The whole row was refused, so no commit batch exists to carry the news.
	// Before this callback the typed value left the staging map unannounced.
	it('reports a refused cell when the flush produces no commit at all', () => {
		const { container, editRow1, save, onCommit, onReject } = renderGrid()

		editRow1()

		fireEvent.change(getSlot<HTMLInputElement>(container, 'grid-edit-input'), {
			target: { value: '' },
		})

		save()

		expect(onReject).toHaveBeenCalledExactlyOnceWith([{ rowKey: 1, columnId: 'name', value: '' }])

		expect(onCommit).not.toHaveBeenCalled()
	})

	it('reports the refused cell beside the commit batch of the same row', () => {
		const cols: GridColumn<SessionRow>[] = [
			...requiredName,
			sessionColumns[1] as GridColumn<SessionRow>,
		]

		const { container, editRow1, save, onCommit, onReject } = renderGrid(cols)

		editRow1()

		fireEvent.change(getSlot<HTMLInputElement>(container, 'grid-edit-input'), {
			target: { value: '' },
		})

		fireEvent.change(getSlot<HTMLInputElement>(container, 'grid-edit-number-input'), {
			target: { value: '9' },
		})

		save()

		expect(onReject).toHaveBeenCalledExactlyOnceWith([{ rowKey: 1, columnId: 'name', value: '' }])

		expect(onCommit).toHaveBeenCalledExactlyOnceWith([{ rowKey: 1, columnId: 'count', value: 9 }])
	})

	it('says nothing when every staged cell commits', () => {
		const { container, editRow1, save, onCommit, onReject } = renderGrid()

		editRow1()

		fireEvent.change(getSlot<HTMLInputElement>(container, 'grid-edit-input'), {
			target: { value: 'Fixed' },
		})

		save()

		expect(onCommit).toHaveBeenCalledOnce()

		expect(onReject).not.toHaveBeenCalled()
	})

	// An unchanged cell is dropped too, and it is no refusal: the user turned
	// nothing away, so the row has no other half to report.
	it('says nothing for a row the user opened and left alone', () => {
		const { editRow1, save, onCommit, onReject } = renderGrid()

		editRow1()

		save()

		expect(onCommit).not.toHaveBeenCalled()

		expect(onReject).not.toHaveBeenCalled()
	})
})
