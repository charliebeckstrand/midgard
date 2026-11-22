import { describe, expect, it, vi } from 'vitest'
import { Grid, type GridColumn } from '../../modules/grid'
import { fireEvent, renderUI, screen } from '../helpers'

type Row = { id: number; name: string; locked?: boolean }

const rows: Row[] = [
	{ id: 1, name: 'Ada' },
	{ id: 2, name: 'Bo' },
	{ id: 3, name: 'Cy', locked: true },
	{ id: 4, name: 'Di' },
]

const columns: GridColumn<Row>[] = [
	{ id: 'select', selectable: true },
	{ id: 'name', title: 'Name', cell: (row) => row.name, value: (row) => row.name },
]

/** Renders a grid with a selection column, and reports each selection. */
function renderSelectable(rowSelectable?: (row: Row) => boolean) {
	const onValueChange = vi.fn()

	renderUI(
		<Grid
			columns={columns}
			rows={rows}
			getKey={(row) => row.id}
			rowLabel={(row) => row.name}
			selection={{ onValueChange, rowSelectable }}
		/>,
	)

	const box = (name: string) => screen.getByRole('checkbox', { name: `Select ${name}` })

	const selected = () => [...((onValueChange.mock.lastCall?.[0] as Set<number>) ?? [])].sort()

	return { box, selected }
}

/**
 * Shift with a click on a row checkbox selects the span from the last toggled
 * row, and `rowSelectable` disables the checkbox of a row that it rejects.
 */
describe('Grid selection span and rowSelectable', () => {
	it('selects the span from the last toggled row on a click with Shift', () => {
		const { box, selected } = renderSelectable()

		fireEvent.click(box('Ada'))

		fireEvent.click(box('Di'), { shiftKey: true })

		expect(selected()).toEqual([1, 2, 3, 4])
	})

	it('toggles one row on a click with no Shift', () => {
		const { box, selected } = renderSelectable()

		fireEvent.click(box('Ada'))

		fireEvent.click(box('Di'))

		expect(selected()).toEqual([1, 4])
	})

	it('disables the checkbox of a rejected row, and leaves it out of a span and select-all', () => {
		const { box, selected } = renderSelectable((row) => !row.locked)

		expect(box('Cy')).toBeDisabled()

		expect(box('Bo')).toBeEnabled()

		fireEvent.click(box('Ada'))

		fireEvent.click(box('Di'), { shiftKey: true })

		expect(selected()).toEqual([1, 2, 4])

		const all = screen.getByRole('checkbox', { name: /Select all/ })

		// Every row that can take the selection holds it, so the header is checked.
		expect(all).toBeChecked()

		fireEvent.click(all)

		expect(selected()).toEqual([])

		fireEvent.click(all)

		expect(selected()).toEqual([1, 2, 4])
	})

	it('runs a span over the leaves that a grouped grid shows, and skips a closed group', () => {
		type Member = { id: number; name: string; team: string }

		const members: Member[] = [
			{ id: 1, name: 'Ada', team: 'A' },
			{ id: 2, name: 'Bo', team: 'B' },
			{ id: 3, name: 'Cy', team: 'C' },
			{ id: 4, name: 'Di', team: 'A' },
		]

		const onValueChange = vi.fn()

		renderUI(
			<Grid
				columns={[
					{ id: 'select', selectable: true },
					{ id: 'name', title: 'Name', cell: (row: Member) => row.name, value: (row) => row.name },
					{ id: 'team', title: 'Team', cell: (row: Member) => row.team, value: (row) => row.team },
				]}
				rows={members}
				getKey={(row) => row.id}
				rowLabel={(row) => row.name}
				groupBy={{ value: 'team' }}
				selection={{ onValueChange }}
			/>,
		)

		// Close team B, which shows between team A and team C.
		fireEvent.click(screen.getByRole('button', { name: /^B \(/, expanded: true }))

		fireEvent.click(screen.getByRole('checkbox', { name: 'Select Ada' }))

		fireEvent.click(screen.getByRole('checkbox', { name: 'Select Cy' }), { shiftKey: true })

		// The hidden leaf of team B stays out of the span.
		const [last] = (onValueChange.mock.lastCall ?? [new Set()]) as [Set<number>]

		expect([...last].sort()).toEqual([1, 3, 4])
	})
})
