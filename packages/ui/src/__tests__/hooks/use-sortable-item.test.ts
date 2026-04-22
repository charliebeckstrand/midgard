import { DndContext } from '@dnd-kit/core'
import { SortableContext } from '@dnd-kit/sortable'
import { renderHook } from '@testing-library/react'
import { createElement, type ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import { useSortableItem } from '../../hooks/use-sortable-item'

function wrapper({ children }: { children: ReactNode }) {
	return createElement(DndContext, null, createElement(SortableContext, { items: ['a'], children }))
}

describe('useSortableItem', () => {
	it('returns the expected shape', () => {
		const { result } = renderHook(() => useSortableItem({ id: 'a' }), { wrapper })

		expect(result.current).toMatchObject({
			setNodeRef: expect.any(Function),
			setActivatorNodeRef: expect.any(Function),
			style: expect.any(Object),
			isDragging: false,
		})
	})

	it('emits an opacity-1 style when not dragging', () => {
		const { result } = renderHook(() => useSortableItem({ id: 'a' }), { wrapper })

		expect(result.current.style.opacity).toBe(1)
	})
})
