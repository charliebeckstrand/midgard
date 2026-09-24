import { describe, expect, it, vi } from 'vitest'
import { Grid, type GridColumn } from '../../modules/grid'
import { bySlot, renderUI } from '../helpers'

/**
 * `virtualize` on the client-grouped and master-detail bodies. jsdom lays
 * nothing out, so the window holds no rows here. These cases hold the gates,
 * the row count, and the table role. The browser suite holds the window
 * itself (`grid-virtualized-grouped`, `grid-virtualized-detail`).
 */
describe('Grid virtualize on a self-rendering body', () => {
	type Person = { id: number; name: string; role: string; n: number }

	const people: Person[] = Array.from({ length: 30 }, (_, i) => ({
		id: i + 1,
		name: `Person ${i + 1}`,
		role: ['Alpha', 'Bravo', 'Charlie'][i % 3] as string,
		n: i,
	}))

	const columns: GridColumn<Person>[] = [
		{ id: 'name', title: 'Name', cell: (row) => row.name, value: (row) => row.name },
		{ id: 'role', title: 'Role', cell: (row) => row.role, value: (row) => row.role },
		{ id: 'n', title: 'N', cell: (row) => row.n, value: (row) => row.n, aggFunc: 'sum' },
	]

	const getKey = (row: Person) => row.id

	it('windows a grouped grid and counts its headers, leaves, and totals', () => {
		const { container } = renderUI(
			<Grid
				columns={columns}
				rows={people}
				getKey={getKey}
				groupBy={{ value: 'role' }}
				groupTotalRow
				virtualize
				maxHeight="300px"
			/>,
		)

		const table = container.querySelector('table')

		expect(table).toHaveAttribute('role', 'table')

		// The header row, 3 group headers, 30 leaves, and 3 totals.
		expect(table).toHaveAttribute('aria-rowcount', String(1 + 3 + 30 + 3))

		// The window holds no rows in jsdom, so no leaf renders.
		expect(container.querySelectorAll('tr[data-grid-row]')).toHaveLength(0)
	})

	it('windows a master-detail grid and counts each open panel', () => {
		const { container } = renderUI(
			<Grid
				columns={[{ id: 'expand', expander: true }, ...columns]}
				rows={people}
				getKey={getKey}
				expandable={{ value: new Set([2, 5]), render: (row) => <p>{row.name}</p> }}
				virtualize
				maxHeight="300px"
			/>,
		)

		const table = container.querySelector('table')

		expect(table).toHaveAttribute('role', 'table')

		expect(table).toHaveAttribute('aria-rowcount', String(1 + 30 + 2))

		expect(container.querySelectorAll('tr[data-detail-row]')).toHaveLength(0)
	})

	it('stands infinite scroll down under grouping', () => {
		const onLoadMore = vi.fn()

		const { container } = renderUI(
			<Grid
				columns={columns}
				rows={people}
				getKey={getKey}
				groupBy={{ value: 'role' }}
				virtualize
				infiniteScroll={{ onLoadMore, hasMore: false, endMessage: 'The end' }}
				maxHeight="300px"
			/>,
		)

		expect(bySlot(container, 'grid-load-end')).toBeNull()

		expect(onLoadMore).not.toHaveBeenCalled()
	})

	it('does not window a grouped grid that infinite scroll alone implies', () => {
		const { container } = renderUI(
			<Grid
				columns={columns}
				rows={people}
				getKey={getKey}
				groupBy={{ value: 'role' }}
				infiniteScroll={{ onLoadMore: vi.fn() }}
				maxHeight="300px"
			/>,
		)

		expect(container.querySelector('table')).not.toHaveAttribute('role')

		expect(container.querySelectorAll('tr[data-grid-row]')).toHaveLength(people.length)
	})

	it('keeps manual grouping unwindowed', () => {
		type Entry = Person & { header?: boolean }

		const entries: Entry[] = [
			{ id: 100, name: 'Alpha', role: 'Alpha', n: 0, header: true },
			...people.slice(0, 5),
		]

		const { container } = renderUI(
			<Grid<Entry>
				columns={columns as GridColumn<Entry>[]}
				rows={entries}
				getKey={(row) => row.id}
				groupBy={{
					manual: true,
					value: 'role',
					expanded: new Set(['Alpha']),
					groupRow: (row) => (row.header ? { key: 'Alpha', value: 'Alpha', count: 5 } : null),
				}}
				virtualize
				maxHeight="300px"
			/>,
		)

		expect(container.querySelector('table')).not.toHaveAttribute('aria-rowcount')

		expect(container.querySelectorAll('tr[data-grid-row]')).toHaveLength(5)
	})
})
