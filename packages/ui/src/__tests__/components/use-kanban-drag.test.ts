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

	return { api: result.current, onReorder }
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

	it.each<[string, (api: ReturnType<typeof useKanbanDrag<Card, Column>>) => void]>([
		['drag cancel', (api) => api.handleDragCancel()],
		['drag end', (api) => api.handleDragEnd(makeDragEvent('a', 'a'))],
	])('sets activeId on drag start and clears it on %s', (_name, finish) => {
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

		act(() => {
			finish(result.current)
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

	it.each<[string, string, string | null]>([
		['the drag is within the same column', 'a', 'b'],
		['there is no over target', 'a', null],
		['active and over are the same id', 'a', 'a'],
		['the active card has no owning column', 'ghost', 'doing'],
	])('is a no-op when %s', (_name, activeId, overId) => {
		const onReorder = vi.fn()

		const { api } = setup({ onReorder })

		api.handleDragOver(makeDragEvent(activeId, overId))

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

	it.each<[string, string, string | null]>([
		['dragging across columns (already handled in dragOver)', 'a', 'c'],
		['there is no over target', 'a', null],
		['handleDragEnd targets an unknown active card', 'ghost', 'a'],
		// 'unknown' is neither a column id nor a card id, so findColumn returns
		// undefined and the handler bails at the `!activeCol || !overCol` guard.
		['the over id resolves to no column', 'a', 'unknown'],
	])('is a no-op when %s', (_name, activeId, overId) => {
		const onReorder = vi.fn()

		const { api } = setup({ onReorder })

		api.handleDragEnd(makeDragEvent(activeId, overId))

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
	it('emits once for a drop at the slot where the card came in', () => {
		const { result, onReorder, ids } = startCrossColumnDrag()

		expect(onReorder).toHaveBeenCalledTimes(1)

		expect(ids(1)).toEqual(['a', 'c'])

		// The card is under the pointer at its entry slot, so the over target is
		// the card itself.
		act(() => {
			result.current.handleDragEnd(makeDragEvent('a', 'a'))
		})

		expect(onReorder).toHaveBeenCalledTimes(1)

		expect(ids(1)).toEqual(['a', 'c'])
	})

	it('commits the slot of the card under the pointer after a move in the new column', () => {
		const { result, onReorder, ids } = startCrossColumnDrag()

		// The preview shows the card at the slot of `c`, below it.
		act(() => {
			result.current.handleDragEnd(makeDragEvent('a', 'c'))
		})

		expect(onReorder).toHaveBeenCalledTimes(2)

		expect(ids(0)).toEqual(['b'])

		expect(ids(1)).toEqual(['c', 'a'])
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
