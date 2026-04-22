import { horizontalListSortingStrategy, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useSortableList } from '../../hooks/use-sortable-list'

type Item = { id: string; label: string }

const items: Item[] = [
	{ id: 'a', label: 'Alpha' },
	{ id: 'b', label: 'Bravo' },
	{ id: 'c', label: 'Charlie' },
]

describe('useSortableList', () => {
	it('computes itemIds from getKey', () => {
		const { result } = renderHook(() => useSortableList({ items, getKey: (i) => i.id }))

		expect(result.current.itemIds).toEqual(['a', 'b', 'c'])
	})

	it('defaults to vertical orientation and strategy', () => {
		const { result } = renderHook(() => useSortableList({ items, getKey: (i) => i.id }))

		expect(result.current.orientation).toBe('vertical')

		expect(result.current.strategy).toBe(verticalListSortingStrategy)
	})

	it('uses horizontal strategy when orientation is horizontal', () => {
		const { result } = renderHook(() =>
			useSortableList({ items, getKey: (i) => i.id, orientation: 'horizontal' }),
		)

		expect(result.current.strategy).toBe(horizontalListSortingStrategy)
	})

	it('is not interactive without an onReorder callback', () => {
		const { result } = renderHook(() => useSortableList({ items, getKey: (i) => i.id }))

		expect(result.current.interactive).toBe(false)
	})

	it('is interactive when onReorder is provided and not disabled', () => {
		const { result } = renderHook(() =>
			useSortableList({ items, getKey: (i) => i.id, onReorder: vi.fn() }),
		)

		expect(result.current.interactive).toBe(true)
	})

	it('is not interactive when disabled is set', () => {
		const { result } = renderHook(() =>
			useSortableList({ items, getKey: (i) => i.id, onReorder: vi.fn(), disabled: true }),
		)

		expect(result.current.interactive).toBe(false)
	})

	it('activeId starts null', () => {
		const { result } = renderHook(() => useSortableList({ items, getKey: (i) => i.id }))

		expect(result.current.activeId).toBeNull()
	})
})
