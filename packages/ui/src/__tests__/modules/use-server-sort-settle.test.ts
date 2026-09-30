import { renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { GridSortState } from '../../modules/grid'
import { useServerSortSettle } from '../../modules/grid/grid-sort-state'

const rows = [{ id: 1 }, { id: 2 }]

const asc: GridSortState[] = [{ column: 'name', direction: 'asc' }]

describe('useServerSortSettle', () => {
	it('settles a sort change in the render of the change, with no second render', () => {
		let renders = 0

		const { result, rerender } = renderHook(
			({ sort, rowsNow }: { sort: GridSortState[]; rowsNow: typeof rows }) => {
				renders++

				return useServerSortSettle({ enabled: true, sort, rows: rowsNow })
			},
			{ initialProps: { sort: [] as GridSortState[], rowsNow: rows } },
		)

		expect(result.current).toBe(false)

		renders = 0

		// The sort moves and the rows do not yet: the grid settles at once.
		rerender({ sort: asc, rowsNow: rows })

		expect(result.current).toBe(true)

		expect(renders).toBe(1)

		// The rows land: the settle lifts.
		rerender({ sort: asc, rowsNow: [...rows] })

		expect(result.current).toBe(false)
	})
})
