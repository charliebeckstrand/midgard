import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core'
import { horizontalListSortingStrategy, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { act, renderHook } from '@testing-library/react'
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

	it('sets activeId on drag start and clears it on drag cancel', () => {
		const { result } = renderHook(() =>
			useSortableList({ items, getKey: (i) => i.id, onReorder: vi.fn() }),
		)

		act(() => {
			result.current.dndContextProps.onDragStart({ active: { id: 'b' } } as DragStartEvent)
		})

		expect(result.current.activeId).toBe('b')

		act(() => {
			result.current.dndContextProps.onDragCancel()
		})

		expect(result.current.activeId).toBeNull()
	})

	it('calls onReorder with a new ordering when drag ends on a different item', () => {
		const onReorder = vi.fn()

		const { result } = renderHook(() => useSortableList({ items, getKey: (i) => i.id, onReorder }))

		act(() => {
			result.current.dndContextProps.onDragEnd({
				active: { id: 'a' },
				over: { id: 'c' },
			} as DragEndEvent)
		})

		expect(onReorder).toHaveBeenCalledOnce()

		expect(onReorder.mock.calls[0]?.[0].map((i: Item) => i.id)).toEqual(['b', 'c', 'a'])
	})

	it('does not call onReorder when drag ends over the same item', () => {
		const onReorder = vi.fn()

		const { result } = renderHook(() => useSortableList({ items, getKey: (i) => i.id, onReorder }))

		act(() => {
			result.current.dndContextProps.onDragEnd({
				active: { id: 'a' },
				over: { id: 'a' },
			} as DragEndEvent)
		})

		expect(onReorder).not.toHaveBeenCalled()
	})

	it('does not call onReorder when drag ends without an over target', () => {
		const onReorder = vi.fn()

		const { result } = renderHook(() => useSortableList({ items, getKey: (i) => i.id, onReorder }))

		act(() => {
			result.current.dndContextProps.onDragEnd({
				active: { id: 'a' },
				over: null,
			} as DragEndEvent)
		})

		expect(onReorder).not.toHaveBeenCalled()
	})

	it('does not throw on drag end when onReorder is not provided', () => {
		const { result } = renderHook(() => useSortableList({ items, getKey: (i) => i.id }))

		expect(() =>
			act(() => {
				result.current.dndContextProps.onDragEnd({
					active: { id: 'a' },
					over: { id: 'b' },
				} as DragEndEvent)
			}),
		).not.toThrow()
	})
})
