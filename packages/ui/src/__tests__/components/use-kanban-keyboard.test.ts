import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { KanbanColumnBase } from '../../components/kanban/types'
import { useKanbanKeyboard } from '../../components/kanban/use-kanban-keyboard'
import { attach, makeKeyEvent } from '../helpers'

const containerRef = { current: document.body }

type Card = { id: string }

type Column = KanbanColumnBase<Card> & { id: string; items: Card[] }

function makeColumns(): Column[] {
	return [
		{ id: 'a', items: [{ id: 'a1' }, { id: 'a2' }] },
		{ id: 'b', items: [{ id: 'b1' }] },
		{ id: 'c', items: [] },
	]
}

function setup(onReorder?: (next: Column[]) => void) {
	const { result } = renderHook(() =>
		useKanbanKeyboard<Card, Column>({
			containerRef,
			columns: makeColumns(),
			getKey: (i) => i.id,
			onReorder,
		}),
	)

	/** Sends one key to a card, inside `act`. */
	const press = (cardId: string, event: ReturnType<typeof makeKeyEvent>) => {
		act(() => {
			result.current.onCardKeyDown(cardId, event)
		})
	}

	return { result, press }
}

/** The card ids of each column in the first `onReorder` call. */
function reordered(onReorder: ReturnType<typeof vi.fn>) {
	const next = onReorder.mock.calls[0]?.[0] as Column[] | undefined

	return next?.map((column) => column.items.map((i) => i.id))
}

describe('useKanbanKeyboard: lift state', () => {
	it('lifts and drops a card on Space', () => {
		const { result, press } = setup()

		expect(result.current.liftedCardId).toBeNull()

		press('a1', makeKeyEvent(' '))

		expect(result.current.liftedCardId).toBe('a1')

		press('a1', makeKeyEvent(' '))

		expect(result.current.liftedCardId).toBeNull()
	})

	it('ignores modifier keys', () => {
		const { result, press } = setup()

		press('a1', makeKeyEvent(' ', { shiftKey: true }))

		expect(result.current.liftedCardId).toBeNull()
	})

	it.each(['Escape', 'Enter'])('drops the lifted card on %s', (key) => {
		const { result, press } = setup()

		press('a1', makeKeyEvent(' '))

		expect(result.current.liftedCardId).toBe('a1')

		press('a1', makeKeyEvent(key))

		expect(result.current.liftedCardId).toBeNull()
	})

	it('clears liftedCardId on blur', () => {
		const { result, press } = setup()

		press('a1', makeKeyEvent(' '))

		expect(result.current.liftedCardId).toBe('a1')

		act(() => {
			result.current.onCardBlur()
		})

		expect(result.current.liftedCardId).toBeNull()
	})
})

describe('useKanbanKeyboard: focus navigation', () => {
	beforeEach(() => {
		for (const id of ['a1', 'a2', 'b1']) {
			const el = document.createElement('div')

			el.setAttribute('data-slot', 'kanban-card')

			el.setAttribute('data-card-id', id)

			el.setAttribute('tabindex', '0')

			attach(el)
		}
	})

	it.each([
		['the next card in the column on ArrowDown', 'a1', 'ArrowDown', 'a2'],
		['the previous card in the column on ArrowUp', 'a2', 'ArrowUp', 'a1'],
		['the first card on Home', 'a2', 'Home', 'a1'],
		['the last card on End', 'a1', 'End', 'a2'],
		['the next column on ArrowRight', 'a1', 'ArrowRight', 'b1'],
	])('moves focus to %s', (_name, from, key, expected) => {
		const { press } = setup()

		const event = makeKeyEvent(key)

		press(from, event)

		expect(event.preventDefault).toHaveBeenCalled()

		expect(document.activeElement?.getAttribute('data-card-id')).toBe(expected)
	})

	it.each([
		['when moving to an empty column', 'b1', 'ArrowRight'],
		['when moving left from the first column', 'a1', 'ArrowLeft'],
		['when the card id is not found', 'unknown', 'ArrowDown'],
	])('does nothing %s', (_name, from, key) => {
		const { press } = setup()

		const event = makeKeyEvent(key)

		press(from, event)

		expect(event.preventDefault).not.toHaveBeenCalled()
	})
})

describe('useKanbanKeyboard: reordering a lifted card', () => {
	it.each([
		['down within its column on ArrowDown', 'a1', 'ArrowDown', [['a2', 'a1'], ['b1'], []]],
		['up within its column on ArrowUp', 'a2', 'ArrowUp', [['a2', 'a1'], ['b1'], []]],
		['to the next column on ArrowRight', 'a1', 'ArrowRight', [['a2'], ['b1', 'a1'], []]],
		// 'b1' sits in column index 1, and column index 2 exists but is empty.
		['into an empty column on ArrowRight', 'b1', 'ArrowRight', [['a1', 'a2'], [], ['b1']]],
	])('moves the card %s', (_name, card, key, expected) => {
		const onReorder = vi.fn()

		const { press } = setup(onReorder)

		press(card, makeKeyEvent(' '))

		press(card, makeKeyEvent(key))

		expect(onReorder).toHaveBeenCalledOnce()

		expect(reordered(onReorder)).toEqual(expected)
	})

	it.each([
		['past the end of a column', 'a2', 'ArrowDown'],
		['out of bounds between columns', 'a1', 'ArrowLeft'],
		['when the lifted card id is unknown', 'ghost', 'ArrowRight'],
	])('does not call onReorder when moving %s', (_name, card, key) => {
		const onReorder = vi.fn()

		const { press } = setup(onReorder)

		press(card, makeKeyEvent(' '))

		press(card, makeKeyEvent(key))

		expect(onReorder).not.toHaveBeenCalled()
	})

	it('is a no-op when onReorder is not provided', () => {
		const { press } = setup()

		press('a1', makeKeyEvent(' '))

		expect(() => press('a1', makeKeyEvent('ArrowDown'))).not.toThrow()
	})
})
