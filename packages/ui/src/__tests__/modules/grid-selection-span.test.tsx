import '../setup/grid-modules'
import { describe, expect, it, vi } from 'vitest'
import {
	Grid,
	type GridColumn,
	type GridGroupHeaderRow,
	type GridSortState,
} from '../../modules/grid'
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

	// A rejected row cannot take the selection, so it states no selected state.
	it('gives a rejected row no aria-selected', () => {
		const { box } = renderSelectable((row) => !row.locked)

		expect(box('Cy').closest('tr')).not.toHaveAttribute('aria-selected')

		expect(box('Bo').closest('tr')).toHaveAttribute('aria-selected', 'false')
	})

	it('shows the header clear when only a rejected row holds the selection', () => {
		renderUI(
			<Grid
				columns={columns}
				rows={rows}
				getKey={(row) => row.id}
				rowLabel={(row) => row.name}
				selection={{ defaultValue: new Set([3]), rowSelectable: (row) => !row.locked }}
			/>,
		)

		const all = screen.getByRole('checkbox', { name: /Select all/ })

		expect(all).not.toBeChecked()

		expect(all).not.toBePartiallyChecked()
	})

	it('disables the header checkbox when it rejects each shown row', () => {
		renderSelectable(() => false)

		expect(screen.getByRole('checkbox', { name: /Select all/ })).toBeDisabled()
	})

	it('selects the span from the last toggled row with Shift and Space on the cursor', () => {
		const onValueChange = vi.fn()

		renderUI(
			<Grid
				columns={columns}
				rows={rows}
				getKey={(row) => row.id}
				rowLabel={(row) => row.name}
				navigable
				selection={{ onValueChange }}
			/>,
		)

		const grid = screen.getByRole('grid')

		fireEvent.mouseDown(screen.getByText('Ada'))

		fireEvent.keyDown(grid, { key: ' ' })

		fireEvent.keyDown(grid, { key: 'ArrowDown' })

		fireEvent.keyDown(grid, { key: 'ArrowDown' })

		fireEvent.keyDown(grid, { key: ' ', shiftKey: true })

		const [last] = (onValueChange.mock.lastCall ?? [new Set()]) as [Set<number>]

		expect([...last].sort()).toEqual([1, 2, 3])
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

/**
 * Under manual grouping, the span runs over the leaves that the manual body
 * shows, in its order: the leaves of a closed group are left out, and a sort on
 * the grouped column moves the group blocks.
 */
describe('Grid selection span with manual groups', () => {
	type Sale = { id: string; region: string; rep?: string; group?: { key: string; count: number } }

	const groupRow = (row: Sale): GridGroupHeaderRow | null =>
		row.group ? { key: row.group.key, value: row.region, count: row.group.count } : null

	const sales: Sale[] = [
		{ id: 'g:west', region: 'West', group: { key: 'west', count: 2 } },
		{ id: 'w1', region: 'West', rep: 'Wade' },
		{ id: 'w2', region: 'West', rep: 'Tanya' },
		{ id: 'g:east', region: 'East', group: { key: 'east', count: 2 } },
		{ id: 'e1', region: 'East', rep: 'Devon' },
		{ id: 'e2', region: 'East', rep: 'Arlene' },
		{ id: 'g:north', region: 'North', group: { key: 'north', count: 1 } },
		{ id: 'n1', region: 'North', rep: 'Nia' },
	]

	const saleColumns: GridColumn<Sale>[] = [
		{ id: 'select', selectable: true },
		{ id: 'region', title: 'Region', cell: (row) => row.region, value: (row) => row.region },
		{ id: 'rep', title: 'Rep', cell: (row) => row.rep ?? '', value: (row) => row.rep ?? '' },
	]

	function renderManual(expanded: string[], sort: GridSortState[] = []) {
		const onValueChange = vi.fn()

		renderUI(
			<Grid
				columns={saleColumns}
				rows={sales}
				getKey={(row) => row.id}
				rowLabel={(row) => row.rep ?? row.region}
				groupBy={{ manual: true, value: 'region', groupRow, expanded: new Set(expanded) }}
				sort={{ defaultValue: sort }}
				selection={{ onValueChange }}
			/>,
		)

		const box = (name: string) => screen.getByRole('checkbox', { name: `Select ${name}` })

		const selected = () => [...((onValueChange.mock.lastCall?.[0] as Set<string>) ?? [])].sort()

		return { box, selected }
	}

	it('leaves out the leaves of a closed group', () => {
		const { box, selected } = renderManual(['west', 'north'])

		fireEvent.click(box('Wade'))

		fireEvent.click(box('Nia'), { shiftKey: true })

		expect(selected()).toEqual(['n1', 'w1', 'w2'])
	})

	it('runs over the order of a sort on the grouped column', () => {
		// The sort shows East, North, and then West.
		const { box, selected } = renderManual(
			['west', 'east', 'north'],
			[{ column: 'region', direction: 'asc' }],
		)

		fireEvent.click(box('Nia'))

		fireEvent.click(box('Wade'), { shiftKey: true })

		expect(selected()).toEqual(['n1', 'w1'])
	})
})
