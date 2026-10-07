import { type Active, closestCenter, type DragStartEvent } from '@dnd-kit/core'
import { horizontalListSortingStrategy, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useListDrag } from '../../components/list/use-list-drag'

/** No root element: these tests read no names. */
const containerRef = { current: null }

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

/** The options that each test shares. */
const base = { containerRef, items, getKey: (item: Item) => item.id, onReorder: () => {} }

describe('useListDrag', () => {
	it('keys the sortable ids with getKey', () => {
		const { result } = renderHook(() => useListDrag<Item>({ ...base, orientation: 'vertical' }))

		expect(result.current.itemIds).toEqual(['a', 'b', 'c'])
	})

	it('reports no active item when none is being dragged', () => {
		const { result } = renderHook(() => useListDrag<Item>({ ...base, orientation: 'horizontal' }))

		expect(result.current.activeId).toBeNull()

		expect(result.current.activeItem).toBeNull()

		expect(result.current.activeIndex).toBe(-1)
	})

	it('exposes the dnd context props for the drag wrapper', () => {
		const { result } = renderHook(() => useListDrag<Item>({ ...base, orientation: 'vertical' }))

		const { dndContextProps } = result.current

		expect(dndContextProps.collisionDetection).toBe(closestCenter)

		expect(dndContextProps.sensors?.length).toBeGreaterThan(0)

		expect(dndContextProps.onDragStart).toBeTypeOf('function')

		expect(dndContextProps.onDragEnd).toBeTypeOf('function')

		expect(dndContextProps.onDragCancel).toBeTypeOf('function')
	})

	it.each([
		['vertical', verticalListSortingStrategy],
		['horizontal', horizontalListSortingStrategy],
	] as const)('sorts a %s list with the strategy of its axis', (orientation, strategy) => {
		const { result } = renderHook(() => useListDrag<Item>({ ...base, orientation }))

		expect(result.current.strategy).toBe(strategy)
	})

	it('reports interactive=false when disabled', () => {
		const { result } = renderHook(() =>
			useListDrag<Item>({ ...base, orientation: 'vertical', disabled: true }),
		)

		expect(result.current.interactive).toBe(false)
	})

	it('resolves activeItem and activeIndex from the items list on drag start', () => {
		const { result } = renderHook(() =>
			useListDrag<Item>({
				containerRef,
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
				containerRef,
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

describe('useListDrag announcements', () => {
	it('names the item from the list in the DOM', () => {
		const list = document.createElement('ul')

		list.innerHTML = items
			.map((item) => `<li data-slot="list-item" data-item-id="${item.id}">${item.label}</li>`)
			.join('')

		const { result } = renderHook(() =>
			useListDrag<Item>({
				containerRef: { current: list },
				items,
				getKey: (item) => item.id,
				onReorder: () => {},
				orientation: 'vertical',
			}),
		)

		const announcements = result.current.dndContextProps.accessibility.announcements

		expect(announcements?.onDragStart({ active: { id: 'b' } as Active })).toBe(
			'Picked up B, position 2 of 3.',
		)
	})
})
