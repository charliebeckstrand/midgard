import { describe, expect, it, vi } from 'vitest'
import { Grid, type GridColumn } from '../../modules/grid'
import { act, allBySlot, fireEvent, present, renderUI, screen } from '../helpers'

type Row = { id: number; name: string; team: string }

const rows: Row[] = [
	{ id: 1, name: 'Alice', team: 'A' },
	{ id: 2, name: 'Bob', team: 'B' },
	{ id: 3, name: 'Carol', team: 'C' },
]

const columns: GridColumn<Row>[] = [
	{ id: 'name', title: 'Name', field: 'name', cell: (row) => row.name },
	{ id: 'team', title: 'Team', field: 'team', readOnly: true, cell: (row) => row.team },
]

/**
 * A grid grouped by team, with team B closed. Each step between data rows
 * goes over the rows that the cursor shows, in its order: Alice, then Carol.
 * Bob is in the closed group between them, so no step reaches him.
 */
function renderGrouped() {
	const onCommit = vi.fn()

	const view = renderUI(
		<Grid
			columns={columns}
			rows={rows}
			getKey={(row) => row.id}
			groupBy={{ defaultValue: 'team' }}
			range
			editable={{ session: 'managed', scope: 'cell', onCommit }}
		/>,
	)

	fireEvent.click(screen.getByRole('button', { name: /^B \(/, expanded: true }))

	const grid = present(view.container.querySelector('table'), 'the grid table')

	const nameCell = (name: string) =>
		present(screen.getByText(name).closest('td'), `the cell of ${name}`)

	return { ...view, grid, nameCell, onCommit }
}

describe('Grid steps between rows in a grouped grid', () => {
	it('enters the next row that the cursor shows on Enter', () => {
		const view = renderGrouped()

		fireEvent.doubleClick(view.nameCell('Alice'))

		const editor = allBySlot(view.container, 'grid-edit-input')[0] as HTMLInputElement

		fireEvent.keyDown(editor, { key: 'Enter' })

		expect(screen.getByRole('textbox', { name: /^Edit Name/ })).toHaveValue('Carol')
	})

	it('fills down into the rows of the range', () => {
		const view = renderGrouped()

		fireEvent.mouseDown(view.nameCell('Alice'))

		fireEvent.mouseUp(view.nameCell('Alice'))

		fireEvent.mouseDown(view.nameCell('Carol'), { shiftKey: true })

		fireEvent.mouseUp(view.nameCell('Carol'))

		fireEvent.keyDown(view.grid, { key: 'd', ctrlKey: true })

		expect(view.onCommit.mock.calls.flat()).toEqual([
			[{ rowKey: 3, columnId: 'name', value: 'Alice' }],
		])
	})

	it('pastes down the rows that the cursor shows', () => {
		const view = renderGrouped()

		fireEvent.mouseDown(view.nameCell('Alice'))

		act(() => view.grid.focus())

		fireEvent.paste(document.body, { clipboardData: { getData: () => 'Ann\nCat\n' } })

		expect(view.onCommit.mock.calls.flat()).toEqual([
			[{ rowKey: 1, columnId: 'name', value: 'Ann' }],
			[{ rowKey: 3, columnId: 'name', value: 'Cat' }],
		])
	})
})
