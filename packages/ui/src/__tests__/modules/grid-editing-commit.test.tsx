import { useState } from 'react'
import { createPortal } from 'react-dom'
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
	act,
	applyChanges,
	bySlot,
	deferred,
	expectAnnouncement,
	fireEvent,
	flushAnnouncer,
	getSlot,
	liveRegion,
	present,
	renderUI,
	setupUser,
} from '../helpers'
import {
	editorsIn,
	renderSessionGrid,
	type SessionRow,
	sessionColumns,
	sessionRows,
} from '../helpers/grid-session'

/**
 * The commit policy of a grid-owned session (`editable.commitOn`). The default
 * commits only on the keys, a move, or the settle pair. `'leaveGrid'` also
 * commits when focus leaves the grid, and `'leaveEditor'` when focus leaves
 * the session's editors. jsdom moves focus through `focus()`, which reports
 * the element that takes focus, as a real focus move does. The pointer and
 * Tab paths are in the browser suite.
 */
describe('Grid commitOn', () => {
	const scopes = ['cell', 'row'] as const

	/** Moves focus to `element`, and flushes the commit that the move causes. */
	const moveFocus = (element: HTMLElement) => act(() => element.focus())

	function renderCommitOn(
		editable: Partial<GridEditableConfig> = {},
		cols: GridColumn<SessionRow>[] = sessionColumns,
	) {
		const onCommit = vi.fn()

		const onReject = vi.fn()

		const view = renderUI(
			<>
				<button type="button">outside</button>
				<Grid
					columns={cols}
					rows={sessionRows}
					getKey={(row) => row.id}
					editable={{ session: 'managed', onCommit, onReject, ...editable }}
				/>
				<div data-floating-ui-portal="">
					<button type="button">unrelated-surface</button>
				</div>
				<button type="button" aria-expanded="true">
					expanded-elsewhere
				</button>
			</>,
		)

		return {
			...view,
			onCommit,
			onReject,
			grid: () => view.getByRole('grid'),
			button: (name: string) => view.getByRole('button', { name }),
			cell: (col: string, rowIndex = 0) =>
				view.container.querySelectorAll<HTMLElement>(`td[data-grid-col="${col}"]`)[
					rowIndex
				] as HTMLElement,
		}
	}

	/** Opens the name cell of the first row and stages `Alicia` in it. */
	function editName(view: ReturnType<typeof renderCommitOn>) {
		fireEvent.doubleClick(view.cell('name'))

		const input = getSlot<HTMLInputElement>(view.container, 'grid-edit-input')

		fireEvent.change(input, { target: { value: 'Alicia' } })

		return input
	}

	const alicia = [{ rowKey: 1, columnId: 'name', value: 'Alicia' }]

	for (const scope of scopes) {
		describe(`under scope '${scope}'`, () => {
			it("commits nothing when focus leaves the grid under the default 'explicit'", () => {
				const view = renderCommitOn({ scope })

				editName(view)

				moveFocus(view.button('outside'))

				expect(view.onCommit).not.toHaveBeenCalled()

				expect(bySlot(view.container, 'grid-edit-input')).toBeInTheDocument()
			})

			it("commits the session when focus leaves the grid under 'leaveGrid'", () => {
				const view = renderCommitOn({ scope, commitOn: 'leaveGrid' })

				editName(view)

				const outside = view.button('outside')

				moveFocus(outside)

				expect(view.onCommit).toHaveBeenCalledExactlyOnceWith(alicia)

				expect(editorsIn(view.container)).toHaveLength(0)

				// The commit does not pull focus back into the grid.
				expect(outside).toHaveFocus()
			})

			it("commits nothing while focus stays in the grid under 'leaveGrid'", () => {
				const view = renderCommitOn({ scope, commitOn: 'leaveGrid' })

				editName(view)

				moveFocus(view.grid())

				expect(view.onCommit).not.toHaveBeenCalled()

				expect(bySlot(view.container, 'grid-edit-input')).toBeInTheDocument()

				// Focus that then leaves from the tab stop leaves the grid too.
				moveFocus(view.button('outside'))

				expect(view.onCommit).toHaveBeenCalledExactlyOnceWith(alicia)
			})

			it("commits the session when focus moves to the tab stop under 'leaveEditor'", () => {
				const view = renderCommitOn({ scope, commitOn: 'leaveEditor' })

				editName(view)

				const grid = view.grid()

				const cursor = grid.getAttribute('aria-activedescendant')

				moveFocus(grid)

				expect(view.onCommit).toHaveBeenCalledExactlyOnceWith(alicia)

				expect(editorsIn(view.container)).toHaveLength(0)

				// Focus stays where the user sent it, and the cursor does not move.
				expect(grid).toHaveFocus()

				expect(grid.getAttribute('aria-activedescendant')).toBe(cursor)
			})

			it('keeps the session while focus is in a floating surface that the editor renders', () => {
				// A slot that renders its own portaled surface, as a date picker or a
				// listbox does. The surface is outside the table in the DOM, and
				// inside the grid in the React tree.
				const cols: GridColumn<SessionRow>[] = [
					{
						...(sessionColumns[0] as GridColumn<SessionRow>),
						editCell: ({ value, onValueUpdate, ariaLabel }) => (
							<>
								<input
									data-slot="slot-input"
									aria-label={ariaLabel}
									value={String(value)}
									onChange={(event) => onValueUpdate(event.target.value)}
								/>
								{createPortal(
									<div data-floating-ui-portal="">
										<button type="button">owned-surface</button>
										<span data-slot="owned-text">Owned text</span>
									</div>,
									document.body,
								)}
							</>
						),
					},
					sessionColumns[1] as GridColumn<SessionRow>,
				]

				for (const commitOn of ['leaveEditor', 'leaveGrid'] as const) {
					const view = renderCommitOn({ scope, commitOn }, cols)

					fireEvent.doubleClick(view.cell('name'))

					const input = getSlot<HTMLInputElement>(view.container, 'slot-input')

					moveFocus(input)

					fireEvent.change(input, { target: { value: 'Alicia' } })

					moveFocus(view.button('owned-surface'))

					// A press in the surface reaches the cell through the React tree. It
					// must not pull focus onto the grid.
					act(() => {
						fireEvent.mouseDown(getSlot(document.body, 'owned-text'))
					})

					expect(view.button('owned-surface')).toHaveFocus()

					expect(view.onCommit).not.toHaveBeenCalled()

					// Back from the surface into the editor is no leave either.
					moveFocus(input)

					expect(view.onCommit).not.toHaveBeenCalled()

					// Out of the surface to a place outside the grid leaves.
					moveFocus(view.button('owned-surface'))

					moveFocus(view.button('outside'))

					expect(view.onCommit).toHaveBeenCalledExactlyOnceWith(alicia)

					view.unmount()
				}
			})

			for (const commitOn of ['leaveEditor', 'leaveGrid'] as const) {
				for (const target of ['unrelated-surface', 'expanded-elsewhere']) {
					it(`commits under '${commitOn}' when focus moves to an ${target} element outside the grid`, () => {
						const view = renderCommitOn({ scope, commitOn })

						editName(view)

						moveFocus(view.button(target))

						// The surface is not the editor's: it is not in the grid's React
						// tree, so the move leaves the grid.
						expect(view.onCommit).toHaveBeenCalledExactlyOnceWith(alicia)

						expect(view.button(target)).toHaveFocus()
					})
				}
			}

			it('keeps the session when the window loses focus', () => {
				const view = renderCommitOn({ scope, commitOn: 'leaveEditor' })

				const input = editName(view)

				// A window blur fires a focus loss that names no next element, while
				// the document has no focus.
				const hasFocus = vi.spyOn(document, 'hasFocus').mockReturnValue(false)

				fireEvent.focusOut(input, { relatedTarget: null })

				hasFocus.mockRestore()

				expect(view.onCommit).not.toHaveBeenCalled()

				expect(bySlot(view.container, 'grid-edit-input')).toBe(input)
			})

			it('refuses an invalid draft on leave, as Enter does', () => {
				const cols: GridColumn<SessionRow>[] = [
					{
						...(sessionColumns[0] as GridColumn<SessionRow>),
						validate: (value) => (String(value).length > 0 ? null : 'Required'),
					},
					sessionColumns[1] as GridColumn<SessionRow>,
				]

				const view = renderCommitOn({ scope, commitOn: 'leaveGrid' }, cols)

				fireEvent.doubleClick(view.cell('name'))

				fireEvent.change(getSlot<HTMLInputElement>(view.container, 'grid-edit-input'), {
					target: { value: '' },
				})

				moveFocus(view.button('outside'))

				// The session ends, and the refused cell goes to `onReject`.
				expect(view.onReject).toHaveBeenCalledExactlyOnceWith([
					{ rowKey: 1, columnId: 'name', value: '' },
				])

				expect(view.onCommit).not.toHaveBeenCalled()

				expect(editorsIn(view.container)).toHaveLength(0)
			})

			it('discards on Escape without a commit on the way out', () => {
				const view = renderCommitOn({ scope, commitOn: 'leaveEditor' })

				const input = editName(view)

				fireEvent.keyDown(input, { key: 'Escape' })

				expect(view.onCommit).not.toHaveBeenCalled()

				expect(editorsIn(view.container)).toHaveLength(0)

				expect(view.grid()).toHaveFocus()
			})
		})
	}

	it("keeps a row session while Tab moves between the row's editors under 'leaveEditor'", async () => {
		const user = setupUser()

		const view = renderCommitOn({ scope: 'row', commitOn: 'leaveEditor' })

		editName(view)

		await user.tab()

		const number = getSlot<HTMLInputElement>(view.container, 'grid-edit-number-input')

		expect(number).toHaveFocus()

		expect(view.onCommit).not.toHaveBeenCalled()

		fireEvent.change(number, { target: { value: '9' } })

		moveFocus(view.button('outside'))

		expect(view.onCommit).toHaveBeenCalledExactlyOnceWith([
			...alicia,
			{ rowKey: 1, columnId: 'count', value: 9 },
		])
	})

	// A row action that discards the open row.
	const withActions: GridColumn<SessionRow>[] = [
		...sessionColumns,
		{
			id: 'actions',
			actions: (_row, { editing, discard }) =>
				editing ? (
					<button type="button" onClick={discard}>
						Discard
					</button>
				) : null,
		},
	]

	it("keeps a row session while focus moves to the row's actions under 'leaveEditor'", () => {
		const view = renderCommitOn({ scope: 'row', commitOn: 'leaveEditor' }, withActions)

		editName(view)

		const discard = view.getByRole('button', { name: 'Discard' })

		// The open row is a row of fields, so its actions are inside what the
		// policy watches, and Discard can still discard.
		moveFocus(discard)

		expect(view.onCommit).not.toHaveBeenCalled()

		// A move out of the row commits it.
		moveFocus(view.button('outside'))

		expect(view.onCommit).toHaveBeenCalledExactlyOnceWith(alicia)
	})

	it("discards from the row's actions under 'leaveEditor'", () => {
		const view = renderCommitOn({ scope: 'row', commitOn: 'leaveEditor' }, withActions)

		editName(view)

		const discard = view.getByRole('button', { name: 'Discard' })

		moveFocus(discard)

		fireEvent.click(discard)

		expect(view.onCommit).not.toHaveBeenCalled()

		expect(editorsIn(view.container)).toEqual([])
	})

	it("commits once on a Tab move under 'leaveEditor', as under the default", () => {
		const onCellChange = vi.fn()

		const view = renderCommitOn({ scope: 'cell', commitOn: 'leaveEditor', onCellChange })

		const input = editName(view)

		fireEvent.keyDown(input, { key: 'Tab' })

		expect(view.onCommit).toHaveBeenCalledExactlyOnceWith(alicia)

		expect(onCellChange.mock.calls).toEqual([
			[{ rowKey: 1, columnId: 'name' }],
			[{ rowKey: 1, columnId: 'count' }],
		])

		expect(getSlot(view.container, 'grid-edit-number-input')).toHaveFocus()
	})

	it("shows only the discard control under 'leaveEditor'", () => {
		const view = renderCommitOn({ scope: 'cell', commitOn: 'leaveEditor' })

		editName(view)

		expect(view.queryByRole('button', { name: 'Save Name, row 2' })).toBeNull()

		const discard = view.button('Discard Name, row 2')

		// Focus that moves to the settle control does not leave the session, so
		// the press discards rather than commits first.
		moveFocus(discard)

		expect(view.onCommit).not.toHaveBeenCalled()

		fireEvent.click(discard)

		expect(view.onCommit).not.toHaveBeenCalled()

		expect(editorsIn(view.container)).toHaveLength(0)
	})

	it("keeps the save and discard pair under 'leaveGrid'", () => {
		const view = renderCommitOn({ scope: 'cell', commitOn: 'leaveGrid' })

		editName(view)

		expect(view.button('Save Name, row 2')).toBeInTheDocument()

		expect(view.button('Discard Name, row 2')).toBeInTheDocument()
	})

	it('commits a controlled cell on leave, reporting null, without a focus move', () => {
		const onCommit = vi.fn()

		const onCellChange = vi.fn()

		function Harness() {
			const [active, setActive] = useState<GridCellRef | null>(null)

			return (
				<>
					<button type="button">outside</button>
					<Grid
						columns={sessionColumns}
						rows={sessionRows}
						getKey={(row) => row.id}
						editable={{
							session: 'managed',
							scope: 'cell',
							commitOn: 'leaveGrid',
							onCommit,
							cell: active,
							onCellChange: (next) => {
								onCellChange(next)

								setActive(next)
							},
						}}
					/>
				</>
			)
		}

		const view = renderUI(<Harness />)

		fireEvent.doubleClick(
			present(view.container.querySelector<HTMLElement>('td[data-grid-col="name"]'), 'name'),
		)

		fireEvent.change(getSlot<HTMLInputElement>(view.container, 'grid-edit-input'), {
			target: { value: 'Alicia' },
		})

		const outside = view.getByRole('button', { name: 'outside' })

		moveFocus(outside)

		expect(onCellChange).toHaveBeenLastCalledWith(null)

		expect(onCommit).toHaveBeenCalledExactlyOnceWith(alicia)

		expect(outside).toHaveFocus()
	})

	it('warns once and stays inert outside a grid-owned session', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

		const view = renderCommitOn({
			session: 'manual',
			commitOn: 'leaveGrid',
			defaultRows: new Set([1]),
		})

		fireEvent.change(getSlot<HTMLInputElement>(view.container, 'grid-edit-input'), {
			target: { value: 'Alicia' },
		})

		moveFocus(view.button('outside'))

		expect(view.onCommit).not.toHaveBeenCalled()

		expect(warn).toHaveBeenCalledOnce()

		expect(warn).toHaveBeenCalledWith(expect.stringContaining('editable.commitOn'))
	})
})

/**
 * A draft belongs to the session, not to the editor that shows it. It lives
 * while the session holds its cell open. An editor that unmounts for a page
 * change, a hidden column, or a row that leaves `rows` for a moment neither
 * commits nor drops it. An editor that mounts again shows it, and the session's
 * close commits it.
 */
describe('Grid session-owned drafts', () => {
	const NAME_EDIT = [{ rowKey: 1, columnId: 'name', value: 'Alicia' }]

	/**
	 * Renders a grid with one row on each page. The harness owns the editable
	 * rows, the data rows, and the hidden columns, and its buttons change each.
	 * `save` empties the editable rows, which is the consumer's own save.
	 */
	function renderDraftGrid(editable: Partial<GridEditableConfig> = {}) {
		const onCommit = vi.fn()

		function Harness() {
			const [editing, setEditing] = useState<Set<string | number>>(new Set())

			const [dropped, setDropped] = useState(false)

			const [hidden, setHidden] = useState(false)

			const actions = {
				edit: () => setEditing(new Set([1])),
				save: () => setEditing(new Set()),
				drop: () => setDropped(true),
				restore: () => setDropped(false),
				hide: () => setHidden(true),
				show: () => setHidden(false),
			}

			return (
				<>
					{Object.entries(actions).map(([name, run]) => (
						<button key={name} type="button" onClick={run}>
							{name}
						</button>
					))}
					<Grid
						columns={sessionColumns}
						rows={dropped ? sessionRows.slice(1) : sessionRows}
						getKey={(row) => row.id}
						pagination={{ defaultValue: { pageIndex: 0, pageSize: 1 } }}
						columnManager={{ hidden: hidden ? new Set(['name']) : new Set() }}
						editable={{ rows: editing, onRowsChange: setEditing, onCommit, ...editable }}
					/>
				</>
			)
		}

		const view = renderUI(<Harness />)

		const click = (name: string) => fireEvent.click(view.getByRole('button', { name }))

		const nameInput = () =>
			view.container.querySelector<HTMLInputElement>('[data-slot="grid-edit-input"]')

		return {
			...view,
			onCommit,
			click,
			nameInput,
			type: (value: string) =>
				fireEvent.change(present(nameInput(), 'grid-edit-input'), { target: { value } }),
			enterName: () =>
				fireEvent.doubleClick(
					present(view.container.querySelector<HTMLElement>('td[data-grid-col="name"]'), 'name'),
				),
		}
	}

	it('shows the draft, not the row, after a page away and back, and commits what it showed', () => {
		const { click, nameInput, type, onCommit } = renderDraftGrid()

		click('edit')

		type('Alicia')

		click('Next page')

		expect(nameInput()).toBeNull()

		click('Previous page')

		// The user reads the value that will commit.
		expect(nameInput()?.value).toBe('Alicia')

		click('save')

		expect(onCommit).toHaveBeenCalledExactlyOnceWith(NAME_EDIT)
	})

	it('shows the draft after its row leaves the data rows and comes back', () => {
		const { click, nameInput, type, onCommit } = renderDraftGrid()

		click('edit')

		type('Alicia')

		click('drop')

		expect(nameInput()).toBeNull()

		click('restore')

		expect(nameInput()?.value).toBe('Alicia')

		expect(onCommit).not.toHaveBeenCalled()

		click('save')

		expect(onCommit).toHaveBeenCalledExactlyOnceWith(NAME_EDIT)
	})

	it.each([
		['a row paged away', 'row', 'Next page'],
		['a row paged away', 'cell', 'Next page'],
		['a hidden column', 'row', 'hide'],
		['a hidden column', 'cell', 'hide'],
	] as const)('commits the draft of %s, under a grid-owned %s session', (_, scope, away) => {
		const { click, enterName, type, onCommit } = renderDraftGrid({ session: 'managed', scope })

		enterName()

		type('Alicia')

		click(away)

		expect(onCommit).not.toHaveBeenCalled()

		click('save')

		expect(onCommit).toHaveBeenCalledExactlyOnceWith(NAME_EDIT)
	})

	it('shows the draft in the held cell after its column hides and shows again', () => {
		const { click, enterName, nameInput, type, onCommit } = renderDraftGrid({
			session: 'managed',
			scope: 'cell',
		})

		enterName()

		type('Alicia')

		click('hide')

		click('show')

		expect(nameInput()?.value).toBe('Alicia')

		click('save')

		expect(onCommit).toHaveBeenCalledExactlyOnceWith(NAME_EDIT)
	})

	it('commits a row gone from the data against its snapshot, with no warning', async () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

		const { click, type, onCommit } = renderDraftGrid()

		click('edit')

		type('Alicia')

		click('drop')

		click('save')

		expect(onCommit).toHaveBeenCalledExactlyOnceWith(NAME_EDIT)

		await expectAnnouncement('Name updated for row 1')

		expect(warn).not.toHaveBeenCalled()
	})

	it('commits the edit of a row on another server page, validated against its snapshot', () => {
		const onCommit = vi.fn()

		const validate = vi.fn(() => null)

		function Harness() {
			const [pageIndex, setPageIndex] = useState(0)

			const [editing, setEditing] = useState<Set<string | number>>(new Set([1]))

			return (
				<>
					<button type="button" onClick={() => setEditing(new Set())}>
						save
					</button>
					<Grid
						columns={[
							{ ...sessionColumns[0], validate } as GridColumn<SessionRow>,
							sessionColumns[1] as GridColumn<SessionRow>,
						]}
						// The consumer holds one server page at a time.
						rows={sessionRows.slice(pageIndex, pageIndex + 1)}
						getKey={(row) => row.id}
						pagination={{
							value: { pageIndex, pageSize: 1 },
							rowCount: 2,
							onValueChange: (next) => setPageIndex(next.pageIndex),
						}}
						editable={{ rows: editing, onRowsChange: setEditing, onCommit }}
					/>
				</>
			)
		}

		const view = renderUI(<Harness />)

		fireEvent.change(getSlot<HTMLInputElement>(view.container, 'grid-edit-input'), {
			target: { value: 'Alicia' },
		})

		fireEvent.click(view.getByRole('button', { name: 'Next page' }))

		expect(view.getByText('Bob')).toBeInTheDocument()

		validate.mockClear()

		fireEvent.click(view.getByRole('button', { name: 'save' }))

		expect(onCommit).toHaveBeenCalledExactlyOnceWith(NAME_EDIT)

		expect(validate).toHaveBeenCalledWith('Alicia', sessionRows[0])
	})

	it('ignores a late write to a cell that a save already closed', () => {
		const onCommit = vi.fn()

		// The slot keeps its staging callback, so the test can call it after the
		// save, as a NumberInput blur that fires after the row closed does.
		let late: ((next: unknown) => void) | null = null

		const cols: GridColumn<SessionRow>[] = [
			{
				id: 'name',
				title: 'Name',
				field: 'name',
				cell: (row) => row.name,
				editCell: ({ value, onValueUpdate, ariaLabel, row }) => {
					if (row.id === 1) late = onValueUpdate

					return (
						<input
							aria-label={ariaLabel}
							data-slot="slot-name"
							value={String(value ?? '')}
							onChange={(event) => onValueUpdate(event.target.value)}
						/>
					)
				},
			},
		]

		function Harness() {
			const [editing, setEditing] = useState<Set<string | number>>(new Set([1]))

			return (
				<>
					<button type="button" onClick={() => setEditing(new Set())}>
						save
					</button>
					<button type="button" onClick={() => setEditing(new Set([2]))}>
						edit-2
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

		const click = (name: string) => fireEvent.click(view.getByRole('button', { name }))

		click('save')

		act(() => late?.('Late'))

		click('edit-2')

		click('save')

		expect(onCommit).not.toHaveBeenCalled()
	})

	it.each(['row', 'cell'] as const)(
		'drops the draft of a paged-away row on Escape, under a %s session',
		(scope) => {
			const { click, enterName, nameInput, type, onCommit, getByRole } = renderDraftGrid({
				session: 'managed',
				scope,
			})

			enterName()

			type('Alicia')

			click('Next page')

			fireEvent.keyDown(getByRole('grid'), { key: 'Escape' })

			click('Previous page')

			expect(onCommit).not.toHaveBeenCalled()

			expect(nameInput()).toBeNull()

			// The session is closed, so an editor that opens again reads the row.
			click('edit')

			expect(nameInput()?.value).toBe('Alice')

			click('save')

			expect(onCommit).not.toHaveBeenCalled()
		},
	)

	it("drops the draft of a hidden column on a row action's discard", () => {
		const onCommit = vi.fn()

		function Harness() {
			const [hidden, setHidden] = useState(false)

			return (
				<>
					<button type="button" onClick={() => setHidden((was) => !was)}>
						toggle
					</button>
					<Grid
						columns={[
							...sessionColumns,
							{
								id: 'actions',
								actions: (_row, context) => (
									<button type="button" onClick={context.discard}>
										discard-row
									</button>
								),
							},
						]}
						rows={sessionRows}
						getKey={(row) => row.id}
						columnManager={{ hidden: hidden ? new Set(['name']) : new Set() }}
						editable={{ defaultRows: new Set([1]), onCommit }}
					/>
				</>
			)
		}

		const view = renderUI(<Harness />)

		fireEvent.change(getSlot<HTMLInputElement>(view.container, 'grid-edit-input'), {
			target: { value: 'Alicia' },
		})

		fireEvent.click(view.getByRole('button', { name: 'toggle' }))

		fireEvent.click(view.getAllByRole('button', { name: 'discard-row' })[0] as HTMLElement)

		fireEvent.click(view.getByRole('button', { name: 'toggle' }))

		expect(onCommit).not.toHaveBeenCalled()

		expect(bySlot(view.container, 'grid-edit-input')).toBeNull()
	})

	it('renders only the editor that takes a keystroke', () => {
		const renders = { name: 0, count: 0, display: 0 }

		const slot =
			(id: 'name' | 'count'): GridColumn<SessionRow>['editCell'] =>
			({ value, onValueUpdate, ariaLabel }) => {
				renders[id]++

				return (
					<input
						aria-label={ariaLabel}
						data-slot={`slot-${id}`}
						value={String(value ?? '')}
						onChange={(event) => onValueUpdate(event.target.value)}
					/>
				)
			}

		const cols: GridColumn<SessionRow>[] = [
			{
				id: 'name',
				title: 'Name',
				field: 'name',
				cell: (row) => {
					renders.display++

					return row.name
				},
				editCell: slot('name'),
			},
			{ id: 'count', title: 'Count', field: 'count', editCell: slot('count') },
		]

		const { container } = renderSessionGrid({ cols, editable: { defaultRows: new Set([1]) } })

		const before = { ...renders }

		fireEvent.change(getSlot<HTMLInputElement>(container, 'slot-name'), {
			target: { value: 'Alicia' },
		})

		// The typed editor renders again. The other editor of the row and the
		// display cell of the other row do not.
		expect(renders.name).toBe(before.name + 1)

		expect(renders.count).toBe(before.count)

		expect(renders.display).toBe(before.display)
	})
})

/**
 * An async `onCommit` (increment 5). A promise holds the batch's cells
 * pending. It settles them as accepted, refused in part, or refused whole.
 * The harness keeps `rows` as state and applies a change only when the test
 * accepts it, so a pending cell's text proves that the grid shows the
 * committed value, not the row's value.
 */
describe('Grid async commit', () => {
	type Flight = {
		changes: GridCellChange[]
		/** Applies the batch to `rows`, then resolves with nothing. */
		accept: (value?: GridCellRefusal[]) => Promise<void>
		/** Applies the cells not named, then resolves with the refusals. */
		refuse: (refusals: GridCellRefusal[]) => Promise<void>
		/** Rejects the promise, and applies nothing. */
		reject: (reason: unknown) => Promise<void>
	}

	/**
	 * Renders the async harness. With `controlRows`, the harness binds `rows`,
	 * and `declineWhen` decides which rows writes of the grid it refuses.
	 */
	function renderAsyncGrid(
		editable: Partial<GridEditableConfig> = {},
		{
			controlRows = false,
			columns = sessionColumns,
		}: { controlRows?: boolean; columns?: GridColumn<SessionRow>[] } = {},
	) {
		const flights: Flight[] = []

		let decline: (next: Set<string | number>) => boolean = () => false

		let setOpen: (next: Set<string | number>) => void = () => {}

		const onCommit = vi.fn()

		const onRowsChange = vi.fn()

		const onReject = vi.fn()

		let setRows: (update: (rows: SessionRow[]) => SessionRow[]) => void = () => {}

		const commit = (changes: GridCellChange[]) => {
			onCommit(changes)

			const pending = deferred<GridCellRefusal[] | undefined>()

			const refuse = async (refusals: GridCellRefusal[]) => {
				const refused = (change: GridCellChange) =>
					refusals.some(
						(refusal) => refusal.rowKey === change.rowKey && refusal.columnId === change.columnId,
					)

				await act(async () => {
					setRows((rows) =>
						applyChanges(
							rows,
							changes.filter((change) => !refused(change)),
						),
					)

					pending.resolve(refusals)
				})
			}

			flights.push({
				changes,
				accept: async (value) => {
					await act(async () => {
						setRows((rows) => applyChanges(rows, changes))

						pending.resolve(value)
					})
				},
				refuse,
				reject: async (reason) => {
					await act(async () => {
						pending.reject(reason)
					})
				},
			})

			return pending.promise
		}

		function Harness() {
			const [rows, set] = useState(sessionRows)

			const [open, setOpenState] = useState<Set<string | number>>(new Set())

			setRows = set

			setOpen = setOpenState

			const bound: Partial<GridEditableConfig> = controlRows
				? {
						rows: open,
						onRowsChange: (next) => {
							onRowsChange(next)

							if (!decline(next)) setOpenState(next)
						},
					}
				: { onRowsChange }

			return (
				<Grid
					columns={columns}
					rows={rows}
					getKey={(row) => row.id}
					editable={{
						session: 'managed',
						onReject,
						onCommit: commit,
						...bound,
						...editable,
					}}
				/>
			)
		}

		const view = renderUI(<Harness />)

		const cell = (col: string, rowIndex = 0) =>
			view.container.querySelectorAll<HTMLElement>(`td[data-grid-col="${col}"]`)[
				rowIndex
			] as HTMLElement

		return {
			...view,
			flights,
			onCommit,
			onRowsChange,
			onReject,
			cell,
			/** Sets which rows writes of the grid the bound `rows` refuses. */
			declineWhen: (rule: (next: Set<string | number>) => boolean) => {
				decline = rule
			},
			/** Writes the bound `rows` from outside, as a consumer save does. */
			setOpenRows: (next: Set<string | number>) => act(() => setOpen(next)),
			/** Replaces the grid's data rows. */
			setData: (update: (rows: SessionRow[]) => SessionRow[]) => act(() => setRows(update)),
		}
	}

	/** Opens the cell, types `value`, and commits with `key` from the editor. */
	function editAndCommit(
		view: ReturnType<typeof renderAsyncGrid>,
		col: string,
		value: string,
		key = 'F2',
	) {
		fireEvent.doubleClick(view.cell(col))

		const input = editorsIn(view.container).find((el) => view.cell(col).contains(el))

		if (!input) throw new Error(`no editor in ${col}`)

		fireEvent.change(input, { target: { value } })

		fireEvent.keyDown(input, { key })
	}

	/** The one editor inside `td`, or `undefined` when the cell reads. */
	const editorIn = (view: ReturnType<typeof renderAsyncGrid>, td: HTMLElement) =>
		editorsIn(view.container).find((el) => td.contains(el)) as HTMLInputElement | undefined

	/** The one editor inside `td`; fails when the cell reads. */
	const editorAt = (view: ReturnType<typeof renderAsyncGrid>, td: HTMLElement) =>
		present<HTMLInputElement>(editorIn(view, td), 'an editor in the cell')

	it('keeps a synchronous onCommit synchronous: no pending state, and an announcement at once', async () => {
		const { container, cell, onCommit } = renderSessionGrid({ editable: { scope: 'cell' } })

		fireEvent.doubleClick(cell('name'))

		const input = getSlot<HTMLInputElement>(container, 'grid-edit-input')

		fireEvent.change(input, { target: { value: 'Alicia' } })

		fireEvent.keyDown(input, { key: 'F2' })

		expect(onCommit).toHaveBeenCalledExactlyOnceWith([
			{ rowKey: 1, columnId: 'name', value: 'Alicia' },
		])

		expect(cell('name')).not.toHaveAttribute('aria-busy')

		expect(bySlot(container, 'grid-edit-pending')).toBeNull()

		await expectAnnouncement('Name updated for row 1')
	})

	it('shows a pending cell busy, with the committed value, and lets no entry open it', () => {
		const view = renderAsyncGrid({ scope: 'cell' })

		editAndCommit(view, 'name', 'Alicia')

		const grid = view.getByRole('grid')

		expect(view.cell('name')).toHaveAttribute('aria-busy', 'true')

		// The row still holds 'Alice'. The cell shows the value in flight.
		expect(view.cell('name')).toHaveTextContent('Alicia')

		expect(bySlot(view.cell('name'), 'grid-edit-pending')).toBeInTheDocument()

		// F2, Enter, and a typed character on the tab stop, and a double-click,
		// all do nothing on the pending cell. The cursor sits on it after F2.
		fireEvent.keyDown(grid, { key: 'F2' })

		fireEvent.keyDown(grid, { key: 'Enter' })

		fireEvent.keyDown(grid, { key: 'x' })

		fireEvent.doubleClick(view.cell('name'))

		expect(editorIn(view, view.cell('name'))).toBeUndefined()

		expect(view.onCommit).toHaveBeenCalledTimes(1)

		// Another cell stays editable while the first is in flight.
		fireEvent.doubleClick(view.cell('count'))

		expect(editorIn(view, view.cell('count'))).toHaveFocus()
	})

	it('accepts a batch on resolve: the cell reads the row, and the grid announces the batch', async () => {
		const view = renderAsyncGrid({ scope: 'cell' })

		editAndCommit(view, 'name', 'Alicia')

		expect(view.cell('name')).toHaveAttribute('aria-busy', 'true')

		// Nothing is saved yet, so nothing is announced yet.
		await act(async () => {})

		await flushAnnouncer()

		expect(liveRegion()?.textContent ?? '').not.toContain('updated')

		await view.flights[0]?.accept()

		expect(view.cell('name')).not.toHaveAttribute('aria-busy')

		expect(bySlot(view.container, 'grid-edit-pending')).toBeNull()

		expect(view.cell('name')).toHaveTextContent('Alicia')

		await expectAnnouncement('Name updated for row 1')
	})

	it('accepts a batch that resolves with an empty list', async () => {
		const view = renderAsyncGrid({ scope: 'cell' })

		editAndCommit(view, 'name', 'Alicia')

		expect(view.cell('name')).toHaveAttribute('aria-busy', 'true')

		await view.flights[0]?.accept([])

		expect(view.cell('name')).not.toHaveAttribute('aria-busy')

		expect(editorIn(view, view.cell('name'))).toBeUndefined()

		await expectAnnouncement('Name updated for row 1')
	})

	it('refuses only the cells a resolve names, and restores their drafts with the error', async () => {
		const view = renderAsyncGrid()

		fireEvent.doubleClick(view.cell('name'))

		const [name, count] = editorsIn(view.container)

		fireEvent.change(present(name, 'the name editor'), { target: { value: 'Alicia' } })

		fireEvent.change(present(count, 'the count editor'), { target: { value: '9' } })

		fireEvent.keyDown(present(name, 'the name editor'), { key: 'Enter' })

		expect(view.onCommit).toHaveBeenCalledExactlyOnceWith([
			{ rowKey: 1, columnId: 'name', value: 'Alicia' },
			{ rowKey: 1, columnId: 'count', value: 9 },
		])

		expect(view.cell('name')).toHaveAttribute('aria-busy', 'true')

		expect(view.cell('count')).toHaveAttribute('aria-busy', 'true')

		view.onRowsChange.mockClear()

		await view.flights[0]?.refuse([{ rowKey: 1, columnId: 'name', error: 'Name taken' }])

		// The row is back in the session, so both editors mount.
		expect(view.onRowsChange).toHaveBeenLastCalledWith(new Set([1]))

		const nameEditor = editorAt(view, view.cell('name'))

		expect(nameEditor.value).toBe('Alicia')

		expect(nameEditor).toHaveAttribute('aria-invalid', 'true')

		const message = present(
			document.getElementById(nameEditor.getAttribute('aria-describedby') ?? ''),
			'the error message',
		)

		expect(message).toHaveAttribute('role', 'alert')

		expect(message).toHaveTextContent('Name taken')

		// The accepted cell reads the row the consumer applied, with no error.
		const countEditor = editorAt(view, view.cell('count'))

		expect(countEditor.value).toBe('9')

		expect(countEditor).not.toHaveAttribute('aria-invalid')

		expect(view.cell('name')).not.toHaveAttribute('aria-busy')

		// A server refusal is not a `validate` refusal.
		expect(view.onReject).not.toHaveBeenCalled()

		await expectAnnouncement('Count updated, Name not saved for row 1')
	})

	it('refuses the whole batch on a rejection, with the error message', async () => {
		const view = renderAsyncGrid()

		fireEvent.doubleClick(view.cell('name'))

		const [name, count] = editorsIn(view.container)

		fireEvent.change(present(name, 'the name editor'), { target: { value: 'Alicia' } })

		fireEvent.change(present(count, 'the count editor'), { target: { value: '9' } })

		fireEvent.keyDown(present(name, 'the name editor'), { key: 'Enter' })

		await view.flights[0]?.reject(new Error('Server down'))

		expect(editorAt(view, view.cell('name')).value).toBe('Alicia')

		expect(editorAt(view, view.cell('count')).value).toBe('9')

		expect(view.getAllByRole('alert').map((el) => el.textContent)).toEqual([
			'Server down',
			'Server down',
		])

		await expectAnnouncement('2 cells not saved for row 1')
	})

	it.each([
		['an error with an empty message', new Error('')],
		['a reason with no message', 'offline'],
		['no reason at all', undefined],
	])('falls back to a generic error for %s', async (_, reason) => {
		const view = renderAsyncGrid()

		editAndCommit(view, 'name', 'Alicia', 'Enter')

		await view.flights[0]?.reject(reason)

		expect(view.getByRole('alert')).toHaveTextContent('Change not saved')
	})

	it('re-opens a refused row without a focus move', async () => {
		const view = renderAsyncGrid()

		editAndCommit(view, 'name', 'Alicia', 'Enter')

		const grid = view.getByRole('grid')

		expect(grid).toHaveFocus()

		await view.flights[0]?.reject(new Error('Server down'))

		expect(editorAt(view, view.cell('name')).value).toBe('Alicia')

		expect(grid).toHaveFocus()
	})

	it('re-opens a refused cell beside the session, and leaves focus in the held editor', async () => {
		const view = renderAsyncGrid({ scope: 'cell' })

		editAndCommit(view, 'name', 'Alicia', 'Tab')

		const countEditor = editorAt(view, view.cell('count'))

		expect(countEditor).toHaveFocus()

		await view.flights[0]?.reject(new Error('Server down'))

		const nameEditor = editorAt(view, view.cell('name'))

		expect(nameEditor.value).toBe('Alicia')

		expect(view.getByRole('alert')).toHaveTextContent('Server down')

		// The session still holds the count cell, and focus stays in its editor.
		expect(countEditor).toHaveFocus()

		expect(view.onCommit).toHaveBeenCalledTimes(1)
	})

	it('clears the error when the user edits the refused cell again', async () => {
		const view = renderAsyncGrid()

		editAndCommit(view, 'name', 'Alicia', 'Enter')

		await view.flights[0]?.reject(new Error('Server down'))

		const nameEditor = editorAt(view, view.cell('name'))

		fireEvent.change(nameEditor, { target: { value: 'Alicia B' } })

		expect(view.queryByRole('alert')).toBeNull()

		expect(nameEditor).not.toHaveAttribute('aria-invalid')

		// The edited draft commits again when the row closes.
		fireEvent.keyDown(nameEditor, { key: 'Enter' })

		expect(view.onCommit).toHaveBeenLastCalledWith([
			{ rowKey: 1, columnId: 'name', value: 'Alicia B' },
		])
	})

	it('drops a refused draft and its error on Escape in a re-opened row', async () => {
		const view = renderAsyncGrid()

		editAndCommit(view, 'name', 'Alicia', 'Enter')

		await view.flights[0]?.reject(new Error('Server down'))

		fireEvent.keyDown(editorAt(view, view.cell('name')), { key: 'Escape' })

		expect(editorsIn(view.container)).toHaveLength(0)

		expect(view.cell('name')).toHaveTextContent('Alice')

		expect(view.onCommit).toHaveBeenCalledTimes(1)

		// The draft is gone: the next session opens on the row's value.
		fireEvent.doubleClick(view.cell('name'))

		expect(editorAt(view, view.cell('name')).value).toBe('Alice')

		expect(view.queryByRole('alert')).toBeNull()
	})

	it('moves a cell-scoped session onto a held cell as focus enters it, and Escape drops it', async () => {
		const view = renderAsyncGrid({ scope: 'cell' })

		editAndCommit(view, 'name', 'Alicia', 'Tab')

		const countEditor = editorAt(view, view.cell('count'))

		fireEvent.change(countEditor, { target: { value: '9' } })

		await view.flights[0]?.reject(new Error('Server down'))

		const nameEditor = editorAt(view, view.cell('name'))

		act(() => nameEditor.focus())

		// The session left the count cell, so its draft committed.
		expect(view.onCommit).toHaveBeenLastCalledWith([{ rowKey: 1, columnId: 'count', value: 9 }])

		expect(editorIn(view, view.cell('count'))).toBeUndefined()

		fireEvent.keyDown(nameEditor, { key: 'Escape' })

		expect(editorIn(view, view.cell('name'))).toBeUndefined()

		expect(view.cell('name')).toHaveTextContent('Alice')

		expect(view.queryByRole('alert')).toBeNull()
	})

	describe('focus into a held editor with its own handlers and surface', () => {
		// A name slot whose input stops the focus event, and that renders a portaled
		// surface, as a date picker or a listbox does.
		const columns: GridColumn<SessionRow>[] = [
			{
				...(sessionColumns[0] as GridColumn<SessionRow>),
				editCell: ({ value, onValueUpdate, ariaLabel }) => (
					<>
						<input
							data-slot="slot-input"
							aria-label={ariaLabel}
							value={String(value)}
							onChange={(event) => onValueUpdate(event.target.value)}
							onFocus={(event) => event.stopPropagation()}
						/>
						{createPortal(
							<div data-floating-ui-portal="">
								<button type="button">held-surface</button>
							</div>,
							document.body,
						)}
					</>
				),
			},
			sessionColumns[1] as GridColumn<SessionRow>,
		]

		/** Holds a refused name cell beside a session on the count cell. */
		async function holdName() {
			const view = renderAsyncGrid({ scope: 'cell' }, { columns })

			fireEvent.doubleClick(view.cell('name'))

			const input = getSlot<HTMLInputElement>(view.container, 'slot-input')

			fireEvent.change(input, { target: { value: 'Alicia' } })

			fireEvent.keyDown(input, { key: 'Tab' })

			fireEvent.change(editorAt(view, view.cell('count')), { target: { value: '9' } })

			await view.flights[0]?.reject(new Error('Server down'))

			return { view, input: getSlot<HTMLInputElement>(view.container, 'slot-input') }
		}

		// The cell listens on its own element, so it hears the focus before the
		// handlers of the slot run, and a handler that stops the event does not
		// keep the session off the cell.
		it('moves the session onto the cell when a handler of the slot stops the focus event', async () => {
			const { view, input } = await holdName()

			act(() => input.focus())

			expect(view.onCommit).toHaveBeenLastCalledWith([{ rowKey: 1, columnId: 'count', value: 9 }])

			expect(editorIn(view, view.cell('count'))).toBeUndefined()
		})

		// Focus in a portaled surface does not enter the element of the cell, so the
		// session stays on its own cell.
		it('keeps the session on its cell when focus enters a portaled surface of the held editor', async () => {
			const { view } = await holdName()

			act(() => view.getByRole('button', { name: 'held-surface' }).focus())

			expect(view.onCommit).toHaveBeenCalledTimes(1)

			expect(editorAt(view, view.cell('count')).value).toBe('9')
		})
	})

	it('enters a held cell from the tab stop: F2 keeps the draft, a typed key replaces it', async () => {
		const view = renderAsyncGrid({ scope: 'cell' })

		const grid = view.getByRole('grid')

		editAndCommit(view, 'name', 'Alicia')

		await view.flights[0]?.reject(new Error('Server down'))

		// F2 left the cursor on the cell, and the refusal did not move focus.
		expect(grid).toHaveFocus()

		fireEvent.keyDown(grid, { key: 'F2' })

		const held = editorAt(view, view.cell('name'))

		expect(held).toHaveFocus()

		expect(held.value).toBe('Alicia')

		expect(view.getByRole('alert')).toHaveTextContent('Server down')

		// Leave the cell unedited, and a second refusal holds it open again.
		fireEvent.keyDown(held, { key: 'F2' })

		expect(view.onCommit).toHaveBeenLastCalledWith([
			{ rowKey: 1, columnId: 'name', value: 'Alicia' },
		])

		await view.flights[1]?.reject(new Error('Server down'))

		fireEvent.keyDown(grid, { key: 'Z' })

		const typed = editorAt(view, view.cell('name'))

		expect(typed.value).toBe('Z')

		expect(typed).toHaveFocus()

		expect(view.queryByRole('alert')).toBeNull()
	})

	it('drops the refused drafts when a controlled rows declines to open the row again', async () => {
		const view = renderAsyncGrid({}, { controlRows: true })

		editAndCommit(view, 'name', 'Alicia', 'Enter')

		expect(view.onCommit).toHaveBeenCalledTimes(1)

		// The consumer refuses to open row 1 again.
		view.declineWhen((next) => next.has(1))

		await view.flights[0]?.reject(new Error('Server down'))

		expect(editorsIn(view.container)).toHaveLength(0)

		await expectAnnouncement('1 change discarded')

		// An unrelated session on row 2 opens and closes. Its sweep must not send
		// the refused draft of row 1 again.
		view.declineWhen(() => false)

		fireEvent.doubleClick(view.cell('name', 1))

		fireEvent.keyDown(editorAt(view, view.cell('name', 1)), { key: 'Escape' })

		expect(view.onCommit).toHaveBeenCalledTimes(1)

		// The draft is gone: row 1 opens on its own value.
		fireEvent.doubleClick(view.cell('name'))

		expect(editorAt(view, view.cell('name')).value).toBe('Alice')
	})

	it('drops a held cell of a cell-scoped session when the consumer closes its row', async () => {
		const view = renderAsyncGrid({ scope: 'cell' }, { controlRows: true })

		editAndCommit(view, 'name', 'Alicia', 'Tab')

		await view.flights[0]?.reject(new Error('Server down'))

		expect(editorAt(view, view.cell('name')).value).toBe('Alicia')

		// The consumer closes row 1, which also closes the count cell of the session.
		view.setOpenRows(new Set())

		expect(editorsIn(view.container)).toHaveLength(0)

		await expectAnnouncement('1 change discarded')

		expect(view.onCommit).toHaveBeenCalledTimes(1)
	})

	it('keeps a held cell when the grid itself closes its row', async () => {
		const view = renderAsyncGrid({ scope: 'cell' }, { controlRows: true })

		editAndCommit(view, 'name', 'Alicia', 'Tab')

		await view.flights[0]?.reject(new Error('Server down'))

		// F2 from the count editor ends the session, which closes row 1.
		fireEvent.keyDown(editorAt(view, view.cell('count')), { key: 'F2' })

		expect(view.onRowsChange).toHaveBeenLastCalledWith(new Set())

		expect(editorAt(view, view.cell('name')).value).toBe('Alicia')
	})

	it('frees a held cell whose row the consumer deletes, at the next sweep', async () => {
		const view = renderAsyncGrid({ scope: 'cell' })

		// Enter moves the session to row 2, so row 1 holds no session.
		editAndCommit(view, 'name', 'Alicia', 'Enter')

		await view.flights[0]?.reject(new Error('Server down'))

		expect(editorAt(view, view.cell('name')).value).toBe('Alicia')

		view.setData((rows) => rows.filter((row) => row.id !== 1))

		// A Tab moves the session, which runs the sweep.
		fireEvent.keyDown(editorAt(view, view.cell('name')), { key: 'Tab' })

		await expectAnnouncement('1 change discarded')

		// The row comes back, and nothing of the refused draft is left.
		view.setData(() => sessionRows)

		expect(editorIn(view, view.cell('name'))).toBeUndefined()

		expect(view.cell('name')).toHaveTextContent('Alice')
	})

	it('keeps the prototype of a class row in the pending display', () => {
		class Member {
			id: number

			name: string

			constructor(id: number, name: string) {
				this.id = id

				this.name = name
			}

			shout() {
				return this.name.toUpperCase()
			}

			get initial() {
				return this.name.charAt(0)
			}
		}

		const members = [new Member(1, 'Alice'), new Member(2, 'Bob')]

		const columns: GridColumn<Member>[] = [
			{
				id: 'name',
				title: 'Name',
				field: 'name',
				cell: (row) => `${row.shout()} (${row.initial})`,
			},
		]

		const view = renderUI(
			<Grid
				columns={columns}
				rows={members}
				getKey={(row) => row.id}
				editable={{
					session: 'managed',
					scope: 'cell',
					onCommit: () => new Promise<void>(() => {}),
				}}
			/>,
		)

		const cell = present(view.container.querySelector('td[data-grid-col="name"]'), 'the name cell')

		fireEvent.doubleClick(cell)

		const input = getSlot<HTMLInputElement>(view.container, 'grid-edit-input')

		fireEvent.change(input, { target: { value: 'Alicia' } })

		fireEvent.keyDown(input, { key: 'F2' })

		expect(cell).toHaveAttribute('aria-busy', 'true')

		expect(cell).toHaveTextContent('ALICIA (A)')
	})

	it('changes nothing, and warns of nothing, when a batch settles after the unmount', async () => {
		const error = vi.spyOn(console, 'error').mockImplementation(() => {})

		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

		const first = renderAsyncGrid()

		editAndCommit(first, 'name', 'Alicia', 'Enter')

		const second = renderAsyncGrid()

		editAndCommit(second, 'name', 'Alicia', 'Enter')

		first.unmount()

		second.unmount()

		// Start from a silent region, so any text below is a late settle's.
		await act(async () => {})

		const region = liveRegion()

		if (region) region.textContent = ''

		await first.flights[0]?.accept()

		await second.flights[0]?.reject(new Error('Server down'))

		expect(error).not.toHaveBeenCalled()

		expect(warn).not.toHaveBeenCalled()

		expect(liveRegion()?.textContent ?? '').not.toMatch(/updated|not saved/)
	})

	it('runs two batches of one cell-scoped session at once, and settles each on its own', async () => {
		const onCellChange = vi.fn()

		const view = renderAsyncGrid({ scope: 'cell', onCellChange })

		editAndCommit(view, 'name', 'Alicia', 'Tab')

		const countEditor = editorAt(view, view.cell('count'))

		fireEvent.change(countEditor, { target: { value: '9' } })

		// Tab has no other open cell to reach, because the name cell is pending,
		// so it commits the count cell in place.
		fireEvent.keyDown(countEditor, { key: 'Tab' })

		expect(view.onCommit).toHaveBeenCalledTimes(2)

		expect(view.cell('name')).toHaveAttribute('aria-busy', 'true')

		expect(view.cell('count')).toHaveAttribute('aria-busy', 'true')

		expect(onCellChange).toHaveBeenLastCalledWith(null)

		// The later batch settles first.
		await view.flights[1]?.accept()

		expect(view.cell('count')).not.toHaveAttribute('aria-busy')

		expect(view.cell('count')).toHaveTextContent('9')

		expect(view.cell('name')).toHaveAttribute('aria-busy', 'true')

		await expectAnnouncement('Count updated for row 1')

		await view.flights[0]?.refuse([{ rowKey: 1, columnId: 'name', error: 'Name taken' }])

		expect(editorAt(view, view.cell('name')).value).toBe('Alicia')

		await expectAnnouncement('Name not saved for row 1')
	})

	it('keeps a later cell move working while an earlier cell is pending', async () => {
		const view = renderAsyncGrid({ scope: 'cell' })

		editAndCommit(view, 'name', 'Alicia', 'Enter')

		// Enter moved the session down one row.
		const bob = editorAt(view, view.cell('name', 1))

		expect(bob).toHaveFocus()

		fireEvent.change(bob, { target: { value: 'Robert' } })

		fireEvent.keyDown(bob, { key: 'Tab' })

		expect(view.onCommit).toHaveBeenLastCalledWith([
			{ rowKey: 2, columnId: 'name', value: 'Robert' },
		])

		expect(editorAt(view, view.cell('count', 1))).toHaveFocus()

		expect(view.cell('name')).toHaveAttribute('aria-busy', 'true')

		expect(view.cell('name', 1)).toHaveAttribute('aria-busy', 'true')
	})
})
