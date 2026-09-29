import { renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { GridColumn, GridColumnFilterState, GridSortState } from '../../modules/grid'
import { useGridTable } from '../../modules/grid/use-grid-table'
import { createGroup, createRule } from '../../modules/query'

/**
 * The work that the client view does for a change that nothing reads. A view
 * that filters nothing keeps the rows as they are, and a grouped body builds
 * no flat row list.
 */
type Row = { id: number; name: string; role: string }

const columns: GridColumn<Row>[] = [
	{ id: 'name', title: 'Name', value: (row) => row.name, sortable: true, filterable: true },
	{ id: 'role', title: 'Role', value: (row) => row.role, sortable: true, filterable: true },
]

const rows: Row[] = Array.from({ length: 50 }, (_, id) => ({
	id,
	name: `Name ${id}`,
	role: id % 2 ? 'Admin' : 'User',
}))

function renderTable(props: {
	filters?: GridColumnFilterState[]
	sort?: GridSortState[]
	grouping?: string
	getKey?: (row: Row) => number
}) {
	return renderHook(
		({ sort }: { sort: GridSortState[] }) =>
			useGridTable<Row>({
				rows,
				columns,
				getKey: props.getKey ?? ((row) => row.id),
				globalFilter: { value: '' },
				columnFilters: { value: props.filters ?? [] },
				sort,
				setSort: () => {},
				grouping: props.grouping ?? null,
			}),
		{ initialProps: { sort: props.sort ?? [] } },
	)
}

describe('Grid client view cost', () => {
	it('keeps the rows as they are under a blank column filter', () => {
		const blank = createGroup('and', [
			{
				...createRule({ name: 'name', label: 'Name', type: 'text' }),
				operator: 'contains',
				value: '',
			},
		])

		const { result } = renderTable({ filters: [{ id: 'name', value: blank }] })

		expect(result.current.renderRows).toBe(rows)
	})

	it('reads each key once for a sort flip of a grouped body', () => {
		const getKey = vi.fn((row: Row) => row.id)

		const { rerender } = renderTable({
			grouping: 'role',
			getKey,
			sort: [{ column: 'name', direction: 'asc' }],
		})

		getKey.mockClear()

		rerender({ sort: [{ column: 'name', direction: 'desc' }] })

		// The groups key their leaves. No flat row list reads the keys again.
		expect(getKey.mock.calls.length).toBeLessThanOrEqual(rows.length)
	})

	it('reads no cell for the facets of a manual search that no sheet reads', () => {
		const name = vi.fn((row: Row) => row.name)

		renderHook(() =>
			useGridTable<Row>({
				rows,
				columns: [{ id: 'name', title: 'Name', value: name, filterable: true }],
				getKey: (row) => row.id,
				globalFilter: { value: 'Name 1', manual: true },
				columnFilters: { value: [] },
				sort: [],
				setSort: () => {},
			}),
		)

		// The facet parity test covers the first read, which compiles the search.
		expect(name).not.toHaveBeenCalled()
	})

	it('collects the members of the groups once across a sort flip', () => {
		const role = vi.fn((row: Row) => row.role)

		const counted: GridColumn<Row>[] = [
			columns[0] as GridColumn<Row>,
			{ ...(columns[1] as GridColumn<Row>), value: role },
		]

		const { rerender } = renderHook(
			({ sort }: { sort: GridSortState[] }) =>
				useGridTable<Row>({
					rows,
					columns: counted,
					getKey: (row) => row.id,
					globalFilter: { value: '' },
					columnFilters: { value: [] },
					sort,
					setSort: () => {},
					grouping: 'role',
				}),
			{ initialProps: { sort: [{ column: 'name', direction: 'asc' }] as GridSortState[] } },
		)

		role.mockClear()

		rerender({ sort: [{ column: 'name', direction: 'desc' }] })

		// A group reads the value of its first row for its label. No pass over
		// the rows collects the members again.
		expect(role.mock.calls.length).toBeLessThan(rows.length)
	})
})
