import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useGridRowGrouping } from '../../modules/grid/use-grid-row-grouping'

type Row = { id: number }

/** The manual expansion of a server-grouped grid: a key set that each toggle writes. */
describe('useGridRowGrouping manual toggle', () => {
	it('keeps both of two toggles in one batch', () => {
		const onGroupExpand = vi.fn()

		const { result } = renderHook(() =>
			useGridRowGrouping<Row>({ manual: true, groupRow: () => null, onGroupExpand }, () => true),
		)

		act(() => {
			result.current.toggleGroup('a')

			result.current.toggleGroup('b')
		})

		expect([...result.current.manualExpanded]).toEqual(['a', 'b'])

		expect(onGroupExpand.mock.calls).toEqual([['a'], ['b']])
	})
})
