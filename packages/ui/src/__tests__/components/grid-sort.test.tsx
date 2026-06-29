import { describe, expect, it } from 'vitest'
import { Grid, type GridColumn } from '../../modules/grid'
import { renderUI, screen } from '../helpers'

describe('Grid client sorting', () => {
	type Row = { id: number; name: string }

	const columns: GridColumn<Row>[] = [
		{
			id: 'name',
			title: 'Name',
			cell: (row) => row.name,
			value: (row) => row.name,
			sortable: true,
		},
	]

	const rows: Row[] = [
		{ id: 1, name: 'Charlie' },
		{ id: 2, name: 'Alice' },
		{ id: 3, name: 'Bob' },
	]

	const getKey = (row: Row) => row.id

	const order = () => screen.getAllByRole('cell').map((cell) => cell.textContent)

	it('sorts rows client-side (ascending) when manual is false', () => {
		renderUI(
			<Grid
				columns={columns}
				rows={rows}
				getKey={getKey}
				sort={{ value: [{ column: 'name', direction: 'asc' }], manual: false }}
			/>,
		)

		expect(order()).toEqual(['Alice', 'Bob', 'Charlie'])
	})

	it('sorts descending', () => {
		renderUI(
			<Grid
				columns={columns}
				rows={rows}
				getKey={getKey}
				sort={{ value: [{ column: 'name', direction: 'desc' }], manual: false }}
			/>,
		)

		expect(order()).toEqual(['Charlie', 'Bob', 'Alice'])
	})

	it('leaves row order to the consumer in manual (server) mode', () => {
		renderUI(
			<Grid
				columns={columns}
				rows={rows}
				getKey={getKey}
				sort={{ value: [{ column: 'name', direction: 'asc' }], manual: true }}
			/>,
		)

		// Display-only: the grid does not reorder; the supplied order is preserved.
		expect(order()).toEqual(['Charlie', 'Alice', 'Bob'])
	})

	it('sorts client-side by default, falling back to the row field named by the column id', () => {
		const plainColumns: GridColumn<Row>[] = [
			{ id: 'name', title: 'Name', cell: (row) => row.name, sortable: true },
		]

		renderUI(
			<Grid
				columns={plainColumns}
				rows={rows}
				getKey={getKey}
				sort={{ value: [{ column: 'name', direction: 'asc' }] }}
			/>,
		)

		// No `value` accessor and no `manual`: the engine sorts by `row.name`.
		expect(order()).toEqual(['Alice', 'Bob', 'Charlie'])
	})

	it('sorts money/comma values numerically with the smart default', () => {
		type Money = { id: number; amount: string }

		const moneyColumns: GridColumn<Money>[] = [
			{
				id: 'amount',
				title: 'Amount',
				cell: (row) => row.amount,
				value: (row) => row.amount,
				sortable: true,
			},
		]

		const amounts: Money[] = [
			{ id: 1, amount: '$1,000' },
			{ id: 2, amount: '$90' },
			{ id: 3, amount: '$250' },
		]

		renderUI(
			<Grid
				columns={moneyColumns}
				rows={amounts}
				getKey={(row) => row.id}
				sort={{ value: [{ column: 'amount', direction: 'asc' }] }}
			/>,
		)

		// Lexically `$1,000` would lead; numerically it trails.
		expect(order()).toEqual(['$90', '$250', '$1,000'])
	})

	it('uses a column sortFn as the client comparator', () => {
		type Ranked = { id: number; name: string; rank: number }

		const rankedColumns: GridColumn<Ranked>[] = [
			{
				id: 'name',
				title: 'Name',
				cell: (row) => row.name,
				sortable: true,
				sortFn: (a, b) => a.rank - b.rank,
			},
		]

		const ranked: Ranked[] = [
			{ id: 1, name: 'Aaron', rank: 3 },
			{ id: 2, name: 'Bea', rank: 1 },
			{ id: 3, name: 'Cody', rank: 2 },
		]

		renderUI(
			<Grid
				columns={rankedColumns}
				rows={ranked}
				getKey={(row) => row.id}
				sort={{ value: [{ column: 'name', direction: 'asc' }] }}
			/>,
		)

		// By rank (1, 2, 3), not by name — the sortFn overrides the smart default.
		expect(order()).toEqual(['Bea', 'Cody', 'Aaron'])
	})
})

describe('Grid multi-column sort', () => {
	type Row = { id: number; group: string; name: string }

	const columns: GridColumn<Row>[] = [
		{
			id: 'group',
			title: 'Group',
			cell: (row) => row.group,
			value: (row) => row.group,
			sortable: true,
		},
		{
			id: 'name',
			title: 'Name',
			cell: (row) => row.name,
			value: (row) => row.name,
			sortable: true,
		},
	]

	const rows: Row[] = [
		{ id: 1, group: 'B', name: 'Zoe' },
		{ id: 2, group: 'A', name: 'Bob' },
		{ id: 3, group: 'A', name: 'Ann' },
		{ id: 4, group: 'B', name: 'Amy' },
	]

	const getKey = (row: Row) => row.id

	it('orders rows by each sort column in priority order', () => {
		renderUI(
			<Grid
				columns={columns}
				rows={rows}
				getKey={getKey}
				sort={{
					value: [
						{ column: 'group', direction: 'asc' },
						{ column: 'name', direction: 'asc' },
					],
				}}
			/>,
		)

		// Group ascending first, then name ascending within each group.
		expect(screen.getAllByRole('cell').map((cell) => cell.textContent)).toEqual([
			'A',
			'Ann',
			'A',
			'Bob',
			'B',
			'Amy',
			'B',
			'Zoe',
		])
	})

	it('renders a 1-based priority badge on each sorted header', () => {
		renderUI(
			<Grid
				columns={columns}
				rows={rows}
				getKey={getKey}
				sort={{
					value: [
						{ column: 'name', direction: 'asc' },
						{ column: 'group', direction: 'asc' },
					],
				}}
			/>,
		)

		// Name is priority 1, Group priority 2: the digit shows visually and the
		// priority rides in the button's accessible name (the visible badge is aria-hidden).
		const name = screen.getByRole('button', { name: 'Sort by Name, sort priority 1' })

		const group = screen.getByRole('button', { name: 'Sort by Group, sort priority 2' })

		expect(name.textContent).toContain('1')

		expect(group.textContent).toContain('2')
	})

	it('omits the priority badge under a single-column sort', () => {
		renderUI(
			<Grid
				columns={columns}
				rows={rows}
				getKey={getKey}
				sort={{ value: [{ column: 'name', direction: 'asc' }] }}
			/>,
		)

		// One sort column needs no ranking, so no digit appears in the header.
		expect(screen.getByRole('button', { name: 'Sort by Name' }).textContent).not.toMatch(/\d/)
	})
})
