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
	it('returns the refs and an opacity-1 style while not dragging', () => {
		const { result } = renderHook(() => useSortableItem({ id: 'a' }), { wrapper })

		expect(result.current).toMatchObject({
			setNodeRef: expect.any(Function),
			setActivatorNodeRef: expect.any(Function),
			style: expect.objectContaining({ opacity: 1 }),
			dragging: false,
		})
	})

	it('keeps the style identity while its values hold', () => {
		const { result, rerender } = renderHook(() => useSortableItem({ id: 'a' }), { wrapper })

		// dnd-kit sets the transition on the render after the mount.
		rerender()

		const settled = result.current.style

		rerender()

		expect(result.current.style).toBe(settled)
	})
})
