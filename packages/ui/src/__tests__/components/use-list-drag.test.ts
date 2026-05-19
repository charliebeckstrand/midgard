import type { DragStartEvent } from '@dnd-kit/core'
import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useListDrag } from '../../components/list/use-list-drag'

type Item = { id: string; label: string }

function dragStartEvent(id: string): DragStartEvent {
	const partial: Partial<DragStartEvent> = {
		active: { id } as DragStartEvent['active'],
	}

	return partial as DragStartEvent
}

const items: Item[] = [
	{ id: 'a', label: 'A' },
	{ id: 'b', label: 'B' },
	{ id: 'c', label: 'C' },
]

describe('useListDrag', () => {
	it('uses the provided getKey when one is supplied', () => {
		const getKey = vi.fn((item: Item) => item.id)

		const { result } = renderHook(() =>
			useListDrag<Item>({ items, getKey, orientation: 'vertical' }),
		)

		expect(result.current.effectiveGetKey).toBe(getKey)

		expect(result.current.itemIds).toEqual(['a', 'b', 'c'])
	})

	it('falls back to indexed keys when no getKey is provided', () => {
		const { result } = renderHook(() => useListDrag<Item>({ items, orientation: 'vertical' }))

		const [a, b, c] = items

		expect(result.current.effectiveGetKey(a as Item)).toBe('0')

		expect(result.current.effectiveGetKey(b as Item)).toBe('1')

		expect(result.current.effectiveGetKey(c as Item)).toBe('2')
	})

	it('returns -1 from the fallback key extractor for unknown items', () => {
		const { result } = renderHook(() => useListDrag<Item>({ items, orientation: 'vertical' }))

		const unknown: Item = { id: 'z', label: 'Z' }

		expect(result.current.effectiveGetKey(unknown)).toBe('-1')
	})

	it('reports no active item when none is being dragged', () => {
		const { result } = renderHook(() => useListDrag<Item>({ items, orientation: 'horizontal' }))

		expect(result.current.activeId).toBeNull()

		expect(result.current.activeItem).toBeNull()

		expect(result.current.activeIndex).toBe(-1)
	})

	it('exposes the dnd context props for the drag wrapper', () => {
		const { result } = renderHook(() => useListDrag<Item>({ items, orientation: 'vertical' }))

		expect(result.current.dndContextProps).toBeDefined()

		expect(result.current.strategy).toBeDefined()
	})

	it('reports interactive=false when disabled', () => {
		const { result } = renderHook(() =>
			useListDrag<Item>({ items, orientation: 'vertical', disabled: true }),
		)

		expect(result.current.interactive).toBe(false)
	})

	it('resolves activeItem and activeIndex from the items list on drag start', () => {
		const { result } = renderHook(() =>
			useListDrag<Item>({
				items,
				getKey: (i) => i.id,
				onReorder: () => {},
				orientation: 'vertical',
			}),
		)

		act(() => {
			result.current.dndContextProps.onDragStart(dragStartEvent('b'))
		})

		expect(result.current.activeId).toBe('b')

		expect(result.current.activeItem).toEqual({ id: 'b', label: 'B' })

		expect(result.current.activeIndex).toBe(1)
	})

	it('reports activeItem=null when the active id does not match any item', () => {
		const { result } = renderHook(() =>
			useListDrag<Item>({
				items,
				getKey: (i) => i.id,
				onReorder: () => {},
				orientation: 'vertical',
			}),
		)

		act(() => {
			result.current.dndContextProps.onDragStart(dragStartEvent('missing'))
		})

		expect(result.current.activeId).toBe('missing')

		expect(result.current.activeItem).toBeNull()

		expect(result.current.activeIndex).toBe(-1)
	})
})
