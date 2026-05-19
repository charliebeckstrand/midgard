import type { DragEndEvent, DragOverEvent, DragStartEvent } from '@dnd-kit/core'
import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { KanbanColumnShape } from '../../components/kanban/types'
import { useKanbanDrag } from '../../components/kanban/use-kanban-drag'

type Card = { id: string }

type Column = KanbanColumnShape<Card> & { title: string }

const baseColumns: Column[] = [
	{ id: 'todo', title: 'Todo', items: [{ id: 'a' }, { id: 'b' }] },
	{ id: 'doing', title: 'Doing', items: [{ id: 'c' }] },
]

function setup(options: { columns?: Column[]; onValueChange?: (next: Column[]) => void } = {}) {
	const columns = options.columns ?? baseColumns.map((c) => ({ ...c, items: [...c.items] }))

	const onValueChange = options.onValueChange ?? vi.fn()

	const { result } = renderHook(() =>
		useKanbanDrag<Card, Column>({
			columns,
			getItemKey: (i) => i.id,
			onValueChange,
		}),
	)

	return { api: result.current, columns, onValueChange, rerender: () => result.current }
}

function makeDragStart(id: string): DragStartEvent {
	const partial: Partial<DragStartEvent> = {
		active: { id } as DragStartEvent['active'],
	}

	return partial as DragStartEvent
}

function makeDragEvent(activeId: string, overId: string | null): DragOverEvent & DragEndEvent {
	const partial: Partial<DragOverEvent & DragEndEvent> = {
		active: { id: activeId } as DragOverEvent['active'],
		over: overId ? ({ id: overId } as DragOverEvent['over']) : null,
	}

	return partial as DragOverEvent & DragEndEvent
}

describe('useKanbanDrag: state', () => {
	it('starts with activeId=null', () => {
		const { api } = setup()

		expect(api.activeId).toBeNull()
	})

	it('exposes columnItemIds keyed by column id', () => {
		const { api } = setup()

		expect(api.columnItemIds).toEqual({
			todo: ['a', 'b'],
			doing: ['c'],
		})
	})

	it('sets activeId on drag start', () => {
		const { result } = renderHook(() =>
			useKanbanDrag<Card, Column>({
				columns: baseColumns,
				getItemKey: (i) => i.id,
				onValueChange: () => {},
			}),
		)

		act(() => {
			result.current.handleDragStart(makeDragStart('a'))
		})

		expect(result.current.activeId).toBe('a')
	})

	it('clears activeId on drag cancel', () => {
		const { result } = renderHook(() =>
			useKanbanDrag<Card, Column>({
				columns: baseColumns,
				getItemKey: (i) => i.id,
				onValueChange: () => {},
			}),
		)

		act(() => {
			result.current.handleDragStart(makeDragStart('a'))
		})

		act(() => {
			result.current.handleDragCancel()
		})

		expect(result.current.activeId).toBeNull()
	})

	it('clears activeId on drag end', () => {
		const { result } = renderHook(() =>
			useKanbanDrag<Card, Column>({
				columns: baseColumns,
				getItemKey: (i) => i.id,
				onValueChange: () => {},
			}),
		)

		act(() => {
			result.current.handleDragStart(makeDragStart('a'))
		})

		act(() => {
			result.current.handleDragEnd(makeDragEvent('a', 'a'))
		})

		expect(result.current.activeId).toBeNull()
	})
})

describe('useKanbanDrag: handleDragOver cross-column moves', () => {
	it('moves a card to the end of another column when dropped on the column', () => {
		const onValueChange = vi.fn()

		const { api } = setup({ onValueChange })

		api.handleDragOver(makeDragEvent('a', 'doing'))

		expect(onValueChange).toHaveBeenCalled()

		const next = onValueChange.mock.calls[0]?.[0] as Column[]

		expect(next[0]?.items.map((i) => i.id)).toEqual(['b'])

		expect(next[1]?.items.map((i) => i.id)).toEqual(['c', 'a'])
	})

	it('inserts before the card being hovered in the target column', () => {
		const onValueChange = vi.fn()

		const { api } = setup({ onValueChange })

		api.handleDragOver(makeDragEvent('a', 'c'))

		const next = onValueChange.mock.calls[0]?.[0] as Column[]

		expect(next[1]?.items.map((i) => i.id)).toEqual(['a', 'c'])
	})

	it('is a no-op when the drag is within the same column', () => {
		const onValueChange = vi.fn()

		const { api } = setup({ onValueChange })

		api.handleDragOver(makeDragEvent('a', 'b'))

		expect(onValueChange).not.toHaveBeenCalled()
	})

	it('is a no-op when there is no over target', () => {
		const onValueChange = vi.fn()

		const { api } = setup({ onValueChange })

		api.handleDragOver(makeDragEvent('a', null))

		expect(onValueChange).not.toHaveBeenCalled()
	})

	it('is a no-op when active and over are the same id', () => {
		const onValueChange = vi.fn()

		const { api } = setup({ onValueChange })

		api.handleDragOver(makeDragEvent('a', 'a'))

		expect(onValueChange).not.toHaveBeenCalled()
	})

	it('is a no-op when there is no onValueChange handler', () => {
		const { result } = renderHook(() =>
			useKanbanDrag<Card, Column>({
				columns: baseColumns,
				getItemKey: (i) => i.id,
			}),
		)

		expect(() => result.current.handleDragOver(makeDragEvent('a', 'doing'))).not.toThrow()
	})
})

describe('useKanbanDrag: handleDragEnd same-column reorder', () => {
	it('reorders items within the same column', () => {
		const onValueChange = vi.fn()

		const { api } = setup({ onValueChange })

		api.handleDragEnd(makeDragEvent('a', 'b'))

		const next = onValueChange.mock.calls[0]?.[0] as Column[]

		expect(next[0]?.items.map((i) => i.id)).toEqual(['b', 'a'])
	})

	it('is a no-op when dragging across columns (already handled in dragOver)', () => {
		const onValueChange = vi.fn()

		const { api } = setup({ onValueChange })

		api.handleDragEnd(makeDragEvent('a', 'c'))

		expect(onValueChange).not.toHaveBeenCalled()
	})

	it('is a no-op when there is no over target', () => {
		const onValueChange = vi.fn()

		const { api } = setup({ onValueChange })

		api.handleDragEnd(makeDragEvent('a', null))

		expect(onValueChange).not.toHaveBeenCalled()
	})
})
