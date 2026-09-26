import type { DragEndEvent, DragOverEvent, DragStartEvent } from '@dnd-kit/core'
import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { KanbanColumnBase } from '../../components/kanban/types'
import { useKanbanDrag } from '../../components/kanban/use-kanban-drag'

type Card = { id: string }

type Column = KanbanColumnBase<Card> & { title: string }

const baseColumns: Column[] = [
	{ id: 'todo', title: 'Todo', items: [{ id: 'a' }, { id: 'b' }] },
	{ id: 'doing', title: 'Doing', items: [{ id: 'c' }] },
]

function setup(options: { columns?: Column[]; onReorder?: (next: Column[]) => void } = {}) {
	const columns = options.columns ?? baseColumns.map((c) => ({ ...c, items: [...c.items] }))

	const onReorder = options.onReorder ?? vi.fn()

	const { result } = renderHook(() =>
		useKanbanDrag<Card, Column>({
			columns,
			getKey: (i) => i.id,
			onReorder,
		}),
	)

	return { api: result.current, columns, onReorder, rerender: () => result.current }
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
				getKey: (i) => i.id,
				onReorder: () => {},
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
				getKey: (i) => i.id,
				onReorder: () => {},
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
				getKey: (i) => i.id,
				onReorder: () => {},
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
		const onReorder = vi.fn()

		const { api } = setup({ onReorder })

		api.handleDragOver(makeDragEvent('a', 'doing'))

		expect(onReorder).toHaveBeenCalled()

		const next = onReorder.mock.calls[0]?.[0] as Column[]

		expect(next[0]?.items.map((i) => i.id)).toEqual(['b'])

		expect(next[1]?.items.map((i) => i.id)).toEqual(['c', 'a'])
	})

	it('inserts before the card being hovered in the target column', () => {
		const onReorder = vi.fn()

		const { api } = setup({ onReorder })

		api.handleDragOver(makeDragEvent('a', 'c'))

		const next = onReorder.mock.calls[0]?.[0] as Column[]

		expect(next[1]?.items.map((i) => i.id)).toEqual(['a', 'c'])
	})

	it('is a no-op when the drag is within the same column', () => {
		const onReorder = vi.fn()

		const { api } = setup({ onReorder })

		api.handleDragOver(makeDragEvent('a', 'b'))

		expect(onReorder).not.toHaveBeenCalled()
	})

	it('is a no-op when there is no over target', () => {
		const onReorder = vi.fn()

		const { api } = setup({ onReorder })

		api.handleDragOver(makeDragEvent('a', null))

		expect(onReorder).not.toHaveBeenCalled()
	})

	it('is a no-op when active and over are the same id', () => {
		const onReorder = vi.fn()

		const { api } = setup({ onReorder })

		api.handleDragOver(makeDragEvent('a', 'a'))

		expect(onReorder).not.toHaveBeenCalled()
	})

	it('is a no-op when there is no onReorder handler', () => {
		const { result } = renderHook(() =>
			useKanbanDrag<Card, Column>({
				columns: baseColumns,
				getKey: (i) => i.id,
			}),
		)

		expect(() => result.current.handleDragOver(makeDragEvent('a', 'doing'))).not.toThrow()
	})
})

describe('useKanbanDrag: handleDragEnd same-column reorder', () => {
	it('reorders items within the same column', () => {
		const onReorder = vi.fn()

		const { api } = setup({ onReorder })

		api.handleDragEnd(makeDragEvent('a', 'b'))

		const next = onReorder.mock.calls[0]?.[0] as Column[]

		expect(next[0]?.items.map((i) => i.id)).toEqual(['b', 'a'])
	})

	it('is a no-op when dragging across columns (already handled in dragOver)', () => {
		const onReorder = vi.fn()

		const { api } = setup({ onReorder })

		api.handleDragEnd(makeDragEvent('a', 'c'))

		expect(onReorder).not.toHaveBeenCalled()
	})

	it('is a no-op when there is no over target', () => {
		const onReorder = vi.fn()

		const { api } = setup({ onReorder })

		api.handleDragEnd(makeDragEvent('a', null))

		expect(onReorder).not.toHaveBeenCalled()
	})

	it('is a no-op when handleDragEnd has no onReorder handler', () => {
		const { result } = renderHook(() =>
			useKanbanDrag<Card, Column>({
				columns: baseColumns,
				getKey: (i) => i.id,
			}),
		)

		expect(() => result.current.handleDragEnd(makeDragEvent('a', 'b'))).not.toThrow()
	})

	it('is a no-op when handleDragEnd targets an unknown active card', () => {
		const onReorder = vi.fn()

		const { api } = setup({ onReorder })

		api.handleDragEnd(makeDragEvent('ghost', 'a'))

		expect(onReorder).not.toHaveBeenCalled()
	})

	it('is a no-op when the over id resolves to no column', () => {
		const onReorder = vi.fn()

		const { api } = setup({ onReorder })

		// 'unknown' is neither a column id nor a card id, so findColumn returns
		// undefined and the handler bails at the `!activeCol || !overCol` guard.
		api.handleDragEnd(makeDragEvent('a', 'unknown'))

		expect(onReorder).not.toHaveBeenCalled()
	})
})

describe('useKanbanDrag: handleDragOver edge cases', () => {
	it('skips when the active card has no owning column', () => {
		const onReorder = vi.fn()

		const { api } = setup({ onReorder })

		// Active id that doesn't exist in any column.
		api.handleDragOver(makeDragEvent('ghost', 'doing'))

		expect(onReorder).not.toHaveBeenCalled()
	})
})

/**
 * Drives one cross-column drag the way the shipped board does: a drag start, a
 * drag-over onto a card in another column, then the consumer re-render that the
 * emitted columns cause. The caller makes the drop.
 */
function startCrossColumnDrag() {
	let board = baseColumns.map((c) => ({ ...c, items: [...c.items] }))

	const onReorder = vi.fn((next: Column[]) => {
		board = next
	})

	const { result, rerender } = renderHook(
		({ columns }: { columns: Column[] }) =>
			useKanbanDrag<Card, Column>({ columns, getKey: (i) => i.id, onReorder }),
		{ initialProps: { columns: board } },
	)

	act(() => {
		result.current.handleDragStart(makeDragStart('a'))
	})

	act(() => {
		result.current.handleDragOver(makeDragEvent('a', 'c'))
	})

	rerender({ columns: board })

	return {
		result,
		onReorder,
		ids: (index: number) => board[index]?.items.map((i) => i.id),
	}
}

describe('useKanbanDrag: cross-column drop after the live preview', () => {
	it('emits once for one cross-column drop', () => {
		const { result, onReorder } = startCrossColumnDrag()

		expect(onReorder).toHaveBeenCalledTimes(1)

		act(() => {
			result.current.handleDragEnd(makeDragEvent('a', 'c'))
		})

		expect(onReorder).toHaveBeenCalledTimes(1)
	})

	it('leaves the card at the previewed position', () => {
		const { result, ids } = startCrossColumnDrag()

		expect(ids(1)).toEqual(['a', 'c'])

		act(() => {
			result.current.handleDragEnd(makeDragEvent('a', 'c'))
		})

		expect(ids(1)).toEqual(['a', 'c'])
	})
})

describe('useKanbanDrag: cancel', () => {
	it('puts a card that crossed columns back in its origin column', () => {
		const onReorder = vi.fn()

		const { result, rerender } = renderHook(
			({ columns }: { columns: Column[] }) =>
				useKanbanDrag<Card, Column>({ columns, getKey: (i) => i.id, onReorder }),
			{ initialProps: { columns: baseColumns } },
		)

		act(() => {
			result.current.handleDragStart(makeDragStart('a'))
		})

		act(() => {
			result.current.handleDragOver(makeDragEvent('a', 'doing'))
		})

		// The consumer applies the live move, as a controlled board does.
		const moved = onReorder.mock.lastCall?.[0] as Column[]

		expect(moved.find((c) => c.id === 'doing')?.items.map((i) => i.id)).toEqual(['c', 'a'])

		rerender({ columns: moved })

		act(() => {
			result.current.handleDragCancel()
		})

		expect(onReorder).toHaveBeenCalledTimes(2)

		expect(onReorder).toHaveBeenLastCalledWith(baseColumns)
	})

	it('reports nothing on a cancel with no cross-column move', () => {
		const onReorder = vi.fn()

		const { result } = renderHook(() =>
			useKanbanDrag<Card, Column>({ columns: baseColumns, getKey: (i) => i.id, onReorder }),
		)

		act(() => {
			result.current.handleDragStart(makeDragStart('a'))
		})

		act(() => {
			result.current.handleDragCancel()
		})

		expect(onReorder).not.toHaveBeenCalled()
	})
})
