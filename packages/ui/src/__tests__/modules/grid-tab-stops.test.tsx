import { act, useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { Grid, type GridColumn, type GridEditableConfig } from '../../modules/grid'
import { fireEvent, present, renderUI, screen, setupUser } from '../helpers'

type Row = { id: number; name: string }

const rows: Row[] = [
	{ id: 1, name: 'Alice' },
	{ id: 2, name: 'Bob' },
]

const getKey = (row: Row) => row.id

const columns: GridColumn<Row>[] = [
	{ id: 'name', title: 'Name', cell: (row) => row.name, sortable: true },
	{
		id: 'actions',
		actions: (row) => (
			<>
				<button type="button">Edit {row.name}</button>
				<button type="button">Delete {row.name}</button>
			</>
		),
	},
]

function renderGrid() {
	renderUI(
		<>
			<Grid columns={columns} rows={rows} getKey={getKey} navigable />
			<button type="button">After</button>
		</>,
	)

	return screen.getByRole('grid')
}

/** The elements in the grid that Tab reaches, other than the grid itself. */
function tabbable(grid: HTMLElement): HTMLElement[] {
	return [...grid.querySelectorAll<HTMLElement>('button, [tabindex]')].filter(
		(element) => element.tabIndex >= 0,
	)
}

describe('Grid tab stops', () => {
	it('is one tab stop: the controls in its cells leave the tab order', () => {
		const grid = renderGrid()

		expect(grid).toHaveAttribute('tabindex', '0')

		expect(screen.getByRole('button', { name: 'Edit Alice' })).toHaveAttribute('tabindex', '-1')

		expect(tabbable(grid)).toEqual([])
	})

	it('moves Up from the first row to the header row', () => {
		const grid = renderGrid()

		fireEvent.mouseDown(screen.getByRole('gridcell', { name: 'Alice' }))

		fireEvent.keyDown(grid, { key: 'ArrowUp' })

		const header = screen.getByRole('columnheader', { name: /Name/ })

		expect(grid).toHaveAttribute('aria-activedescendant', header.id)

		expect(header).toHaveAttribute('data-active')
	})

	it('sorts the column on Enter on its header cell', () => {
		const grid = renderGrid()

		fireEvent.mouseDown(screen.getByRole('gridcell', { name: 'Alice' }))

		fireEvent.keyDown(grid, { key: 'ArrowUp' })

		fireEvent.keyDown(grid, { key: 'Enter' })

		expect(screen.getByRole('columnheader', { name: /Name/ })).toHaveAttribute(
			'aria-sort',
			'ascending',
		)

		// The cursor stays on the header cell.
		expect(grid).toHaveFocus()
	})

	it('moves focus to the controls of a header cell on F2', () => {
		const grid = renderGrid()

		fireEvent.mouseDown(screen.getByRole('gridcell', { name: 'Alice' }))

		fireEvent.keyDown(grid, { key: 'ArrowUp' })

		act(() => {
			fireEvent.keyDown(grid, { key: 'F2' })
		})

		expect(screen.getByRole('button', { name: /Sort by Name/ })).toHaveFocus()
	})

	it('reaches the actions column, and Enter moves focus to its first control', () => {
		const grid = renderGrid()

		fireEvent.mouseDown(screen.getByRole('gridcell', { name: 'Alice' }))

		fireEvent.keyDown(grid, { key: 'End' })

		const edit = screen.getByRole('button', { name: 'Edit Alice' })

		const cell = edit.closest('td') as HTMLElement

		expect(grid).toHaveAttribute('aria-activedescendant', cell.id)

		act(() => {
			fireEvent.keyDown(grid, { key: 'Enter' })
		})

		expect(edit).toHaveFocus()

		// The cell that holds focus is open to Tab. The other cells stay closed.
		expect(tabbable(grid)).toEqual([edit, screen.getByRole('button', { name: 'Delete Alice' })])
	})

	it('moves focus back to the grid on Escape, and keeps the cursor on the cell', () => {
		const grid = renderGrid()

		const edit = screen.getByRole('button', { name: 'Edit Bob' })

		act(() => edit.focus())

		act(() => {
			fireEvent.keyDown(edit, { key: 'Escape' })
		})

		expect(grid).toHaveFocus()

		expect(grid).toHaveAttribute('aria-activedescendant', edit.closest('td')?.id)

		expect(tabbable(grid)).toEqual([])
	})

	it('seats the cursor on the cell of a control that takes focus', () => {
		const grid = renderGrid()

		const del = screen.getByRole('button', { name: 'Delete Bob' })

		act(() => del.focus())

		expect(grid).toHaveAttribute('aria-activedescendant', del.closest('td')?.id)
	})

	it('closes the cell when focus leaves the grid', () => {
		const grid = renderGrid()

		act(() => screen.getByRole('button', { name: 'Edit Alice' }).focus())

		expect(tabbable(grid)).not.toEqual([])

		act(() => screen.getByRole('button', { name: 'After' }).focus())

		expect(tabbable(grid)).toEqual([])
	})

	it('gives the controls back their tab order with no cursor', () => {
		renderUI(<Grid columns={columns} rows={rows} getKey={getKey} />)

		expect(screen.getByRole('button', { name: 'Edit Alice' })).not.toHaveAttribute('tabindex')
	})

	// The walk reads the records of a change, so each kind of change must name
	// the controls that it touches.
	describe('after a change of the rows or the controls', () => {
		it('takes a control out of the tab order when it leaves `disabled`', async () => {
			function Harness() {
				const [locked, setLocked] = useState(true)

				const lockColumns: GridColumn<Row>[] = [
					{ id: 'name', title: 'Name', cell: (row) => row.name },
					{
						id: 'actions',
						actions: (row) => (
							<button type="button" disabled={locked}>
								Archive {row.name}
							</button>
						),
					},
				]

				return (
					<>
						<Grid columns={lockColumns} rows={rows} getKey={getKey} navigable />
						<button type="button" onClick={() => setLocked(false)}>
							Unlock
						</button>
					</>
				)
			}

			renderUI(<Harness />)

			// The observer runs in a microtask after the change.
			await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Unlock' })))

			expect(screen.getByRole('button', { name: 'Archive Alice' })).toHaveAttribute(
				'tabindex',
				'-1',
			)

			expect(tabbable(screen.getByRole('grid'))).toEqual([])
		})

		it('takes the controls of a new row out of the tab order', async () => {
			const { rerender } = renderUI(
				<Grid columns={columns} rows={rows} getKey={getKey} navigable />,
			)

			await act(async () =>
				rerender(
					<Grid
						columns={columns}
						rows={[...rows, { id: 3, name: 'Cara' }]}
						getKey={getKey}
						navigable
					/>,
				),
			)

			expect(screen.getByRole('button', { name: 'Edit Cara' })).toHaveAttribute('tabindex', '-1')

			expect(tabbable(screen.getByRole('grid'))).toEqual([])
		})

		// The add commits the new row and moves focus to the slot in one task, so
		// the move of focus must not drop the record of the new row.
		it('takes the controls of a row added from the new-row slot out of the tab order', async () => {
			function Harness() {
				const [list, setList] = useState(rows)

				const addColumns: GridColumn<Row>[] = [
					{ id: 'name', title: 'Name', field: 'name', cell: (row) => row.name },
					{ id: 'actions', actions: (row) => <button type="button">Edit {row.name}</button> },
				]

				return (
					<Grid
						columns={addColumns}
						rows={list}
						getKey={getKey}
						navigable
						editable={{
							session: 'managed',
							newRow: 'bottom',
							onCommit: () => {},
							onRowAdd: (values) =>
								setList((current) => [...current, { id: 3, name: String(values.name) }]),
						}}
					/>
				)
			}

			const { container } = renderUI(<Harness />)

			const editor = present(
				container.querySelector<HTMLInputElement>(
					'[data-slot="grid-new-row"] td[data-grid-new-col="name"] input',
				),
				'new-row editor name',
			)

			act(() => editor.focus())

			fireEvent.change(editor, { target: { value: 'Cara' } })

			await act(async () => fireEvent.keyDown(editor, { key: 'Enter' }))

			expect(screen.getByRole('button', { name: 'Edit Cara' })).toHaveAttribute('tabindex', '-1')
		})

		it('keeps the tab order of each control when a sort moves the rows', () => {
			const grid = renderGrid()

			act(() => screen.getByRole('button', { name: 'Edit Alice' }).focus())

			fireEvent.click(screen.getByRole('button', { name: 'Sort by Name' }))

			fireEvent.click(screen.getByRole('button', { name: 'Sort by Name' }))

			expect(screen.getAllByRole('row')[1]).toHaveTextContent('Bob')

			act(() => screen.getByRole('button', { name: 'Edit Alice' }).focus())

			expect(tabbable(grid).map((element) => element.textContent)).toEqual([
				'Edit Alice',
				'Delete Alice',
			])
		})

		it('leaves a control of a nested grid to that grid', async () => {
			function Harness() {
				const [inner, setInner] = useState(rows)

				return (
					<>
						<Grid
							columns={[{ id: 'expand', expander: true }, ...columns]}
							rows={rows}
							getKey={getKey}
							navigable
							expandable={{
								defaultValue: new Set([1]),
								render: () => <Grid columns={columns} rows={inner} getKey={getKey} navigable />,
							}}
						/>
						<button type="button" onClick={() => setInner([...rows, { id: 3, name: 'Cara' }])}>
							Add
						</button>
					</>
				)
			}

			renderUI(<Harness />)

			await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Add' })))

			const nested = screen.getAllByRole('grid')[1] as HTMLElement

			expect(screen.getByRole('button', { name: 'Edit Cara' })).toHaveAttribute('tabindex', '-1')

			// The panel is a closed cell of the outer grid, so the tab stop of the
			// nested grid is out of the tab order too.
			expect(nested).toHaveAttribute('tabindex', '-1')

			expect(tabbable(nested)).toEqual([])
		})
	})

	describe('a row with open editors', () => {
		type Person = { id: number; name: string; email: string }

		const people: Person[] = [
			{ id: 1, name: 'Alice', email: 'alice@example.com' },
			{ id: 2, name: 'Bob', email: 'bob@example.com' },
		]

		const editColumns: GridColumn<Person>[] = [
			{ id: 'name', title: 'Name', field: 'name', cell: (row) => row.name },
			{ id: 'email', title: 'Email', field: 'email', cell: (row) => row.email },
			{
				id: 'actions',
				actions: (row, { editing, save, discard }) =>
					editing ? (
						<>
							<button type="button" onClick={save}>
								Save
							</button>
							<button type="button" onClick={discard}>
								Discard
							</button>
						</>
					) : (
						<button type="button">Edit {row.name}</button>
					),
			},
		]

		it.each([
			['a grid-owned session', { session: 'managed' }],
			['a row the consumer opens', { rows: new Set([1]) }],
		] satisfies [string, Partial<GridEditableConfig>][])(
			'opens to Tab as a form under %s: editors, then actions',
			async (_name, editable) => {
				const user = setupUser()

				const onCommit = vi.fn()

				renderUI(
					<>
						<Grid
							columns={editColumns}
							rows={people}
							getKey={(row) => row.id}
							editable={{ onCommit, ...editable }}
						/>
						<button type="button">After</button>
					</>,
				)

				if ('session' in editable) fireEvent.doubleClick(screen.getByText('Alice'))

				const [name, email] = screen.getAllByRole('textbox')

				act(() => name?.focus())

				await user.tab()

				expect(email).toHaveFocus()

				await user.tab()

				expect(screen.getByRole('button', { name: 'Save' })).toHaveFocus()

				await user.tab()

				expect(screen.getByRole('button', { name: 'Discard' })).toHaveFocus()

				// The other rows stay closed, so Tab leaves the grid.
				await user.tab()

				expect(screen.getByRole('button', { name: 'After' })).toHaveFocus()
			},
		)
	})
})
