import type { ExpandedState } from '@tanstack/react-table'
import { act, renderHook } from '@testing-library/react'
import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import type { GridColumn } from '../../modules/grid'
import { useGridTable } from '../../modules/grid/use-grid-table'

/**
 * Client grouping gives the grid its groups as values. The engine collects the
 * groups, and the grid opens them from the expansion state it owns. A toggle
 * gives a new value to the group it toggles, and every other group keeps its
 * identity, so a memoized group row re-renders only for its own toggle.
 */
describe('useGridTable groups', () => {
	type Row = { id: number; role: string }

	const rows: Row[] = [
		{ id: 1, role: 'A' },
		{ id: 2, role: 'B' },
		{ id: 3, role: 'A' },
	]

	const columns: GridColumn<Row>[] = [
		{ id: 'role', field: 'role' },
		{ id: 'id', field: 'id' },
	]

	const getKey = (row: Row) => row.id

	function renderGroups(initial: ExpandedState = true) {
		return renderHook(() => {
			const [expanded, setExpanded] = useState<ExpandedState>(initial)

			return {
				expanded,
				table: useGridTable<Row>({
					rows,
					columns,
					getKey,
					grouping: 'role',
					expanded,
					onExpandedChange: setExpanded,
				}),
			}
		})
	}

	it('keys each leaf once, whatever the expansion', () => {
		const { result } = renderGroups()

		expect(result.current.table.rowKeys).toEqual([1, 3, 2])
	})

	it('gives each group its value, its leaves, and its expansion', () => {
		const { result } = renderGroups({ 'role:B': true })

		expect(
			result.current.table.groups?.map((group) => [
				group.value,
				group.expanded,
				group.leaves.map((leaf) => leaf.key),
			]),
		).toEqual([
			['A', false, [1, 3]],
			['B', true, [2]],
		])
	})

	it('closes one group of an all-open grid, and keeps the other group', () => {
		const { result } = renderGroups()

		const [a, b] = result.current.table.groups ?? []

		act(() => result.current.table.toggleGroup('role:A'))

		expect(result.current.expanded).toEqual({ 'role:B': true })

		const [nextA, nextB] = result.current.table.groups ?? []

		expect(nextA?.expanded).toBe(false)

		expect(nextA).not.toBe(a)

		expect(nextB).toBe(b)
	})

	it('opens a closed group again', () => {
		const { result } = renderGroups({})

		act(() => result.current.table.toggleGroup('role:B'))

		expect(result.current.table.groups?.map((group) => group.expanded)).toEqual([false, true])
	})
})
