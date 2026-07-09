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

	const withBlank: Row[] = [
		{ id: 1, name: 'Charlie' },
		{ id: 2, name: '' },
		{ id: 3, name: 'Alice' },
	]

	it('sinks empty values to the end when sorting ascending', () => {
		renderUI(
			<Grid
				columns={columns}
				rows={withBlank}
				getKey={getKey}
				sort={{ value: [{ column: 'name', direction: 'asc' }] }}
			/>,
		)

		expect(order()).toEqual(['Alice', 'Charlie', ''])
	})

	it('keeps empty values at the end when sorting descending', () => {
		renderUI(
			<Grid
				columns={columns}
				rows={withBlank}
				getKey={getKey}
				sort={{ value: [{ column: 'name', direction: 'desc' }] }}
			/>,
		)

		// The regression: desc negates the comparator, so a fixed empties-last sign
		// would float the blank to the top. It must still trail the sorted names.
		expect(order()).toEqual(['Charlie', 'Alice', ''])
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

describe('Grid sort header: reorder-drag hover hold', () => {
	type Row = { id: number; a: string; b: string }

	const columns: GridColumn<Row>[] = [
		{ id: 'a', title: 'A', cell: (row) => row.a, sortable: true },
		{ id: 'b', title: 'B', cell: (row) => row.b, sortable: true },
	]

	const rows: Row[] = [
		{ id: 1, a: 'a1', b: 'b1' },
		{ id: 2, a: 'a2', b: 'b2' },
	]

	// While a column drag lifts and mutes its header, the sortable title must not
	// brighten under the dragging pointer. The hold is a `[data-dragging]`-ancestor
	// override of `fg.hover` on the sort control; assert it rides the sort button
	// (computed `:hover` colour is unreliable in tests — mirror `list.test.tsx`).
	it('holds the sortable title muted on hover under a dragging ancestor', () => {
		renderUI(<Grid columns={columns} rows={rows} getKey={(row) => row.id} reorder />)

		const sortButton = screen.getByRole('button', { name: 'Sort by A' })

		expect(sortButton.className).toContain('[[data-dragging]_&]:hover:not-disabled:text-zinc-500')

		expect(sortButton.className).toContain(
			'dark:[[data-dragging]_&]:hover:not-disabled:text-zinc-400',
		)
	})
})

describe('Grid animated sorting', () => {
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

	// The `<tr>`s carrying a row key — the data rows, skipping the header row.
	const dataRows = () =>
		screen.getAllByRole('row').filter((row) => row.hasAttribute('data-grid-row'))

	// The layout FLIP is a browser lifecycle stubbed to a plain `<tr>` here (motion
	// is globally mocked, CONVENTIONS §10.3); the mock surfaces the `layout` prop as
	// `data-layout`, so these assert the synchronous seam — the opt-in still sorts,
	// and it reaches each row as a real `layout` marker only when enabled.
	it('sorts correctly with the animation opt-in on', () => {
		renderUI(
			<Grid
				columns={columns}
				rows={rows}
				getKey={getKey}
				sort={{ value: [{ column: 'name', direction: 'asc' }], animate: true }}
			/>,
		)

		expect(order()).toEqual(['Alice', 'Bob', 'Charlie'])
	})

	it('marks every data row for the layout FLIP when opted in', () => {
		renderUI(
			<Grid
				columns={columns}
				rows={rows}
				getKey={getKey}
				sort={{ value: [{ column: 'name', direction: 'asc' }], animate: true }}
			/>,
		)

		expect(dataRows().map((row) => row.getAttribute('data-layout'))).toEqual([
			'position',
			'position',
			'position',
		])
	})

	it('leaves rows unmarked without the opt-in', () => {
		renderUI(
			<Grid
				columns={columns}
				rows={rows}
				getKey={getKey}
				sort={{ value: [{ column: 'name', direction: 'asc' }] }}
			/>,
		)

		expect(dataRows().some((row) => row.hasAttribute('data-layout'))).toBe(false)
	})

	it('keeps each row element stable across a re-sort, so it can glide to its new slot', () => {
		const { rerender } = renderUI(
			<Grid
				columns={columns}
				rows={rows}
				getKey={getKey}
				sort={{ value: [{ column: 'name', direction: 'asc' }], animate: true }}
			/>,
		)

		// Grab Alice's row by its stable key before the re-sort.
		const aliceRow = screen.getByText('Alice').closest('[data-grid-row]')

		rerender(
			<Grid
				columns={columns}
				rows={rows}
				getKey={getKey}
				sort={{ value: [{ column: 'name', direction: 'desc' }], animate: true }}
			/>,
		)

		// Desc leads with Charlie and trails with Alice — and Alice is the very same
		// `<tr>` node (moved, not remounted), the identity Framer's `layout` FLIPs.
		expect(order()).toEqual(['Charlie', 'Bob', 'Alice'])

		expect(screen.getByText('Alice').closest('[data-grid-row]')).toBe(aliceRow)
	})
})
