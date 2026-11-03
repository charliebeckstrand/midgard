import { act } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { Grid, type GridColumn, type GridEditableConfig } from '../../modules/grid'
import { fireEvent, renderUI, screen, setupUser } from '../helpers'

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
