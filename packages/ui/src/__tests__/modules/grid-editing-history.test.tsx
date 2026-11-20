import { createRef, useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import {
	Grid,
	type GridCellRefusal,
	type GridEditableConfig,
	type GridHandle,
	type GridHistoryState,
} from '../../modules/grid'
import {
	act,
	applyChanges,
	attach,
	expectAnnouncement,
	fireEvent,
	getSlot,
	liveRegion,
	present,
	renderUI,
} from '../helpers'
import { type SessionRow, sessionColumns, sessionRows } from '../helpers/grid-session'

/**
 * Undo and redo of saved cells (`history: true`). The consumer applies each
 * step through `onCommit`, as it applies a save, so the harness binds `rows`
 * and writes every batch into them. The keys act on the tab stop.
 */
describe('Grid undo and redo (history)', () => {
	/** Types `value` into the count cell of the first row, and saves it with F2. */
	function saveCount(container: HTMLElement, value: string) {
		fireEvent.doubleClick(
			present(container.querySelector('td[data-grid-col="count"]'), 'the count cell'),
		)

		const input = getSlot<HTMLInputElement>(container, 'grid-edit-number-input')

		fireEvent.change(input, { target: { value } })

		fireEvent.keyDown(input, { key: 'F2' })
	}

	function renderHistoryGrid(editable: Partial<GridEditableConfig> = {}) {
		const onCommit = vi.fn()

		let setRows: (update: (rows: SessionRow[]) => SessionRow[]) => void = () => {}

		function Harness() {
			const [rows, set] = useState(sessionRows)

			setRows = set

			return (
				<Grid
					columns={sessionColumns}
					rows={rows}
					getKey={(row) => row.id}
					rowLabel={(row) => row.name}
					editable={{
						session: 'managed',
						scope: 'cell',
						history: true,
						onCommit: (changes) => {
							onCommit(changes)

							set((prev) => applyChanges(prev, changes))
						},
						...editable,
					}}
				/>
			)
		}

		const view = renderUI(<Harness />)

		const grid = view.getByRole('grid')

		const cell = (col: string, rowIndex = 0) =>
			view.container.querySelectorAll<HTMLElement>(`td[data-grid-col="${col}"]`)[
				rowIndex
			] as HTMLElement

		return {
			...view,
			grid,
			cell,
			onCommit,
			setRows: (update: (rows: SessionRow[]) => SessionRow[]) => act(() => setRows(update)),
			saveCount: (value: string) => saveCount(view.container, value),
			press: (key: string, extra: { shiftKey?: boolean; metaKey?: boolean } = {}) =>
				fireEvent.keyDown(grid, { key, ctrlKey: !extra.metaKey, ...extra }),
		}
	}

	it('undoes the last save through onCommit, and moves the cursor to the cell', async () => {
		const view = renderHistoryGrid()

		view.saveCount('9')

		expect(view.onCommit).toHaveBeenLastCalledWith([{ rowKey: 1, columnId: 'count', value: 9 }])

		// Away from the cell, so the move back is visible.
		fireEvent.keyDown(view.grid, { key: 'ArrowDown' })

		view.press('z')

		expect(view.onCommit).toHaveBeenLastCalledWith([{ rowKey: 1, columnId: 'count', value: 2 }])

		expect(view.cell('count')).toHaveTextContent('2')

		expect(view.grid).toHaveAttribute('aria-activedescendant', view.cell('count').id)

		await expectAnnouncement('Count undone for Alice')
	})

	it('redoes an undone save with Shift+Z, Cmd, or Y', async () => {
		const view = renderHistoryGrid()

		view.saveCount('9')

		view.press('z')

		view.press('Z', { shiftKey: true })

		expect(view.cell('count')).toHaveTextContent('9')

		await expectAnnouncement('Count redone for Alice')

		view.press('z', { metaKey: true })

		expect(view.cell('count')).toHaveTextContent('2')

		view.press('y')

		expect(view.cell('count')).toHaveTextContent('9')

		// Each step is one more batch: the save, then four steps.
		expect(view.onCommit).toHaveBeenCalledTimes(5)
	})

	it('leaves Ctrl+Z to an open editor', () => {
		const view = renderHistoryGrid()

		view.saveCount('9')

		fireEvent.doubleClick(view.cell('name'))

		const input = getSlot<HTMLInputElement>(view.container, 'grid-edit-input')

		fireEvent.keyDown(input, { key: 'z', ctrlKey: true })

		// Only the save reached the sink; the key stayed with the input.
		expect(view.onCommit).toHaveBeenCalledTimes(1)

		expect(input).toBeInTheDocument()
	})

	it('waits while a cell of the step has an edit that is not saved', async () => {
		const view = renderHistoryGrid()

		view.saveCount('9')

		fireEvent.doubleClick(view.cell('count'))

		fireEvent.change(getSlot<HTMLInputElement>(view.container, 'grid-edit-number-input'), {
			target: { value: '4' },
		})

		// A press on the tab stop, with the editor and its draft still open.
		view.press('z')

		expect(view.onCommit).toHaveBeenCalledTimes(1)

		await expectAnnouncement('Cannot undo while a cell has an edit')
	})

	it('keeps a value that changed since the save', async () => {
		const view = renderHistoryGrid()

		view.saveCount('9')

		// A refetch writes a new value.
		view.setRows((rows) => applyChanges(rows, [{ rowKey: 1, columnId: 'count', value: 7 }]))

		view.press('z')

		expect(view.onCommit).toHaveBeenCalledTimes(1)

		expect(view.cell('count')).toHaveTextContent('7')

		await expectAnnouncement('Cannot undo, the cells changed')

		// The stale entry is gone, so the stack is empty now.
		view.press('z')

		await expectAnnouncement('Nothing to undo')
	})

	it('clears the redo steps on a new save', async () => {
		const view = renderHistoryGrid()

		view.saveCount('9')

		view.press('z')

		view.saveCount('5')

		view.press('y')

		expect(view.cell('count')).toHaveTextContent('5')

		await expectAnnouncement('Nothing to redo')
	})

	it('records a save under a consumer-owned session', async () => {
		function Harness() {
			const [rows, setRows] = useState(sessionRows)

			const [open, setOpen] = useState<Set<string | number>>(new Set([1]))

			return (
				<>
					<button type="button" onClick={() => setOpen(new Set())}>
						save
					</button>
					<Grid
						columns={sessionColumns}
						rows={rows}
						getKey={(row) => row.id}
						editable={{
							rows: open,
							onRowsChange: setOpen,
							history: true,
							onCommit: (changes) => setRows((prev) => applyChanges(prev, changes)),
						}}
					/>
				</>
			)
		}

		const view = renderUI(<Harness />)

		fireEvent.change(getSlot<HTMLInputElement>(view.container, 'grid-edit-input'), {
			target: { value: 'Alicia' },
		})

		fireEvent.click(view.getByRole('button', { name: 'save' }))

		fireEvent.keyDown(view.getByRole('grid'), { key: 'z', ctrlKey: true })

		expect(view.getByRole('grid')).toHaveTextContent('Alice')

		await expectAnnouncement('Name undone for row 1')
	})

	/**
	 * A history grid whose sink answers later from the moment `later` turns on.
	 * `resolve` applies the last batch and settles it; `refuse` refuses it.
	 */
	function renderLaterGrid({ later = false } = {}) {
		const state = {
			later,
			resolve: () => {},
			refuse: (_refusals: GridCellRefusal[]) => {},
		}

		const onCommit = vi.fn()

		const states: GridHistoryState[] = []

		function Harness() {
			const [rows, setRows] = useState(sessionRows)

			return (
				<Grid
					columns={sessionColumns}
					rows={rows}
					getKey={(row) => row.id}
					rowLabel={(row) => row.name}
					editable={{
						session: 'managed',
						scope: 'cell',
						history: true,
						onHistoryChange: (next) => states.push(next),
						onCommit: (changes) => {
							onCommit(changes)

							const apply = () => setRows((prev) => applyChanges(prev, changes))

							if (!state.later) return apply()

							return new Promise<GridCellRefusal[] | undefined>((done) => {
								state.resolve = () => {
									apply()

									done(undefined)
								}

								state.refuse = done
							})
						},
					}}
				/>
			)
		}

		const view = renderUI(<Harness />)

		const count = () =>
			present(
				view.container.querySelector<HTMLElement>('td[data-grid-col="count"]'),
				'the count cell',
			)

		return {
			...view,
			state,
			states,
			onCommit,
			count,
			saveCount: (value: string) => saveCount(view.container, value),
			undo: () => fireEvent.keyDown(view.getByRole('grid'), { key: 'z', ctrlKey: true }),
		}
	}

	it('pends an async step as a save pends, and speaks the step as it settles', async () => {
		const view = renderLaterGrid()

		view.saveCount('9')

		view.state.later = true

		view.undo()

		expect(view.onCommit).toHaveBeenLastCalledWith([{ rowKey: 1, columnId: 'count', value: 2 }])

		expect(view.count()).toHaveAttribute('aria-busy', 'true')

		await act(async () => view.state.resolve())

		expect(view.count()).not.toHaveAttribute('aria-busy')

		expect(view.count()).toHaveTextContent('2')

		await expectAnnouncement('Count undone for Alice')
	})

	it('records an async save when it is accepted, and not when it is refused', async () => {
		const view = renderLaterGrid({ later: true })

		view.saveCount('9')

		// Not saved yet, so there is nothing to undo.
		view.undo()

		await expectAnnouncement('Nothing to undo')

		await act(async () => view.state.resolve())

		view.undo()

		expect(view.onCommit).toHaveBeenLastCalledWith([{ rowKey: 1, columnId: 'count', value: 2 }])

		await act(async () => view.state.resolve())

		// A refused save leaves the history as it was: the undo above is the
		// newest entry, on the redo stack.
		view.saveCount('4')

		await act(async () => view.state.refuse([{ rowKey: 1, columnId: 'count', error: 'No' }]))

		fireEvent.keyDown(view.getByRole('grid'), { key: 'z', ctrlKey: true })

		await expectAnnouncement('Nothing to undo')
	})

	it('puts a refused async undo back on the undo stack', async () => {
		const view = renderLaterGrid()

		view.saveCount('9')

		view.state.later = true

		view.undo()

		expect(view.states.at(-1)).toEqual({ canUndo: false, canRedo: true })

		await act(async () => view.state.refuse([{ rowKey: 1, columnId: 'count', error: 'No' }]))

		// The cell still holds the saved value, so the undo can run again, and
		// no redo names a step that undid nothing.
		expect(view.states.at(-1)).toEqual({ canUndo: true, canRedo: false })
	})

	it('does nothing without the flag', () => {
		const view = renderHistoryGrid({ history: false })

		view.saveCount('9')

		view.press('z')

		expect(view.onCommit).toHaveBeenCalledTimes(1)

		expect(view.cell('count')).toHaveTextContent('9')
	})
	/** A history grid that hands its commands to a `ref`, and reports its state. */
	function renderHandleGrid(editable: Partial<GridEditableConfig> = {}) {
		const handle = createRef<GridHandle>()

		const states: GridHistoryState[] = []

		const onCommit = vi.fn()

		function Harness() {
			const [rows, setRows] = useState(sessionRows)

			return (
				<Grid
					ref={handle}
					columns={sessionColumns}
					rows={rows}
					getKey={(row) => row.id}
					rowLabel={(row) => row.name}
					editable={{
						session: 'managed',
						scope: 'cell',
						history: true,
						onHistoryChange: (state) => states.push(state),
						onCommit: (changes) => {
							onCommit(changes)

							setRows((prev) => applyChanges(prev, changes))
						},
						...editable,
					}}
				/>
			)
		}

		const view = renderUI(<Harness />)

		const count = () =>
			present(
				view.container.querySelector<HTMLElement>('td[data-grid-col="count"]'),
				'the count cell',
			)

		return {
			...view,
			handle,
			states,
			onCommit,
			count,
			saveCount: (value: string) => saveCount(view.container, value),
			step: (step: 'undo' | 'redo') => {
				const grid = handle.current

				if (!grid) throw new Error('The grid handle is not set.')

				let wrote = false

				act(() => {
					wrote = grid[step]()
				})

				return wrote
			},
		}
	}

	it('undoes and redoes through the ref handle, and reports each flip of the state', async () => {
		const view = renderHandleGrid()

		view.saveCount('9')

		expect(view.states).toEqual([{ canUndo: true, canRedo: false }])

		expect(view.step('undo')).toBe(true)

		expect(view.onCommit).toHaveBeenLastCalledWith([{ rowKey: 1, columnId: 'count', value: 2 }])

		expect(view.count()).toHaveTextContent('2')

		await expectAnnouncement('Count undone for Alice')

		expect(view.step('redo')).toBe(true)

		expect(view.count()).toHaveTextContent('9')

		expect(view.states).toEqual([
			{ canUndo: true, canRedo: false },
			{ canUndo: false, canRedo: true },
			{ canUndo: true, canRedo: false },
		])
	})

	it('leaves the cursor where it is on a step from the handle', () => {
		const view = renderHandleGrid()

		view.saveCount('9')

		const grid = view.getByRole('grid')

		// Focus goes to a toolbar button, so the grid holds no cursor.
		const button = attach(document.createElement('button'))

		act(() => button.focus())

		view.step('undo')

		expect(grid).not.toHaveAttribute('aria-activedescendant')

		expect(view.count()).not.toHaveAttribute('data-active')
	})

	it('returns false with no step to take, and says why', async () => {
		const view = renderHandleGrid()

		expect(view.step('undo')).toBe(false)

		await expectAnnouncement('Nothing to undo')

		expect(view.onCommit).not.toHaveBeenCalled()

		// No flip happened, so nothing was reported.
		expect(view.states).toEqual([])
	})

	it('does nothing and says nothing from the handle with the history off', async () => {
		const view = renderHandleGrid({ history: false })

		view.saveCount('9')

		await expectAnnouncement('Count updated for Alice')

		expect(view.step('undo')).toBe(false)

		expect(view.onCommit).toHaveBeenCalledTimes(1)

		expect(liveRegion()).toHaveTextContent('Count updated for Alice')

		expect(view.states).toEqual([])
	})

	it('reports an empty state once when the history turns off', () => {
		const handle = createRef<GridHandle>()

		const states: GridHistoryState[] = []

		function Harness({ history }: { history: boolean }) {
			const [rows, setRows] = useState(sessionRows)

			return (
				<Grid
					ref={handle}
					columns={sessionColumns}
					rows={rows}
					getKey={(row) => row.id}
					editable={{
						session: 'managed',
						scope: 'cell',
						history,
						onHistoryChange: (state) => states.push(state),
						onCommit: (changes) => setRows((prev) => applyChanges(prev, changes)),
					}}
				/>
			)
		}

		const view = renderUI(<Harness history />)

		saveCount(view.container, '9')

		view.rerender(<Harness history={false} />)

		expect(states).toEqual([
			{ canUndo: true, canRedo: false },
			{ canUndo: false, canRedo: false },
		])
	})
})
