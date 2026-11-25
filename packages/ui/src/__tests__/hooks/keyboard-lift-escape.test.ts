import { act, renderHook } from '@testing-library/react'
import { useState } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useListKeyboard } from '../../components/list/use-list-keyboard'
import * as announcer from '../../core/announcer'
import type { KanbanColumnBase } from '../../modules/kanban/engine/kanban-board'
import { useKanbanKeyboard } from '../../modules/kanban/use-kanban-keyboard'
import { makeKeyEvent } from '../helpers'

/**
 * Each step of a keyboard lift commits. Enter keeps the moves, and Escape puts
 * the item back where the lift started, as a pointer drag cancel does (APG
 * grabbed-element pattern). A lift with no move only drops.
 */

const containerRef = { current: document.body }

type Item = { id: string }

type Column = KanbanColumnBase<Item> & { id: string; items: Item[] }

/** A list that takes each reported order, as a controlled consumer does. */
function setupList() {
	const onReorder = vi.fn()

	const { result } = renderHook(() => {
		const [items, setItems] = useState<Item[]>([{ id: 'a' }, { id: 'b' }, { id: 'c' }])

		const keyboard = useListKeyboard({
			containerRef,
			items,
			getKey: (item) => item.id,
			orientation: 'vertical',
			onReorder: (next) => {
				onReorder(next.map((item) => item.id))

				setItems(next)
			},
			enabled: true,
		})

		return { ...keyboard, items }
	})

	const press = (id: string, key: string) => {
		act(() => result.current.onItemKeyDown(id, makeKeyEvent(key)))
	}

	return { result, press, onReorder }
}

/** A board that takes each reported set of columns. */
function setupBoard() {
	const onReorder = vi.fn()

	const { result } = renderHook(() => {
		const [columns, setColumns] = useState<Column[]>([
			{ id: 'a', items: [{ id: 'a1' }, { id: 'a2' }] },
			{ id: 'b', items: [{ id: 'b1' }] },
		])

		const keyboard = useKanbanKeyboard<Item, Column>({
			containerRef,
			columns,
			getKey: (item) => item.id,
			onReorder: (next) => {
				onReorder(next.map((column) => column.items.map((item) => item.id)))

				setColumns(next)
			},
			enabled: true,
		})

		return { ...keyboard, columns }
	})

	const press = (id: string, key: string) => {
		act(() => result.current.onCardKeyDown(id, makeKeyEvent(key)))
	}

	return { result, press, onReorder }
}

/** The text of the last announcement. */
function lastAnnouncement() {
	return vi.mocked(announcer.announce).mock.calls.at(-1)?.[0]
}

describe('Escape on a keyboard lift', () => {
	beforeEach(() => {
		vi.spyOn(announcer, 'announce').mockImplementation(() => {})
	})

	it('puts a list item back where the lift started, and announces the return', () => {
		const { result, press, onReorder } = setupList()

		press('a', ' ')

		press('a', 'ArrowDown')

		press('a', 'ArrowDown')

		expect(result.current.items.map((item) => item.id)).toEqual(['b', 'c', 'a'])

		press('a', 'Escape')

		expect(onReorder).toHaveBeenLastCalledWith(['a', 'b', 'c'])

		expect(result.current.liftedId).toBeNull()

		// The name comes from the DOM, which this case does not mount.
		expect(lastAnnouncement()).toMatch(/^Returned .*to position 1 of 3\.$/)
	})

	it('keeps the moves on Enter', () => {
		const { result, press, onReorder } = setupList()

		press('a', ' ')

		press('a', 'ArrowDown')

		press('a', 'Enter')

		expect(onReorder).toHaveBeenCalledTimes(1)

		expect(result.current.items.map((item) => item.id)).toEqual(['b', 'a', 'c'])
	})

	it('only drops a lift with no move, and reports nothing', () => {
		const { result, press, onReorder } = setupList()

		press('a', ' ')

		press('a', 'Escape')

		expect(onReorder).not.toHaveBeenCalled()

		expect(result.current.liftedId).toBeNull()
	})

	it('restores from the start of the last lift, not an earlier one', () => {
		const { result, press } = setupList()

		press('a', ' ')

		press('a', 'ArrowDown')

		press('a', 'Enter')

		press('a', ' ')

		press('a', 'ArrowDown')

		press('a', 'Escape')

		expect(result.current.items.map((item) => item.id)).toEqual(['b', 'a', 'c'])
	})

	it('puts a Kanban card back in its column, and announces the return', () => {
		const { result, press, onReorder } = setupBoard()

		press('a1', ' ')

		press('a1', 'ArrowRight')

		expect(result.current.columns.map((column) => column.items.map((item) => item.id))).toEqual([
			['a2'],
			['b1', 'a1'],
		])

		press('a1', 'Escape')

		expect(onReorder).toHaveBeenLastCalledWith([['a1', 'a2'], ['b1']])

		expect(result.current.liftedCardId).toBeNull()

		expect(lastAnnouncement()).toMatch(/^Returned .*to position 1 of 2/)
	})

	it('keeps the Kanban moves on Enter', () => {
		const { result, press, onReorder } = setupBoard()

		press('a1', ' ')

		press('a1', 'ArrowRight')

		press('a1', 'Enter')

		expect(onReorder).toHaveBeenCalledTimes(1)

		expect(result.current.columns[1]?.items.map((item) => item.id)).toEqual(['b1', 'a1'])
	})
})
