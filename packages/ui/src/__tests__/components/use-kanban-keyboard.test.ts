import { act, renderHook } from '@testing-library/react'
import type { KeyboardEvent } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { KanbanColumnShape } from '../../components/kanban/context'
import { useKanbanKeyboard } from '../../components/kanban/use-kanban-keyboard'

type Card = { id: string }

type Column = KanbanColumnShape<Card> & { id: string; items: Card[] }

function makeColumns(): Column[] {
	return [
		{ id: 'a', items: [{ id: 'a1' }, { id: 'a2' }] },
		{ id: 'b', items: [{ id: 'b1' }] },
		{ id: 'c', items: [] },
	]
}

function makeEvent(key: string, opts: Partial<Pick<KeyboardEvent, 'shiftKey' | 'metaKey'>> = {}) {
	return {
		key,
		shiftKey: false,
		metaKey: false,
		ctrlKey: false,
		altKey: false,
		preventDefault: vi.fn(),
		...opts,
	} as unknown as KeyboardEvent
}

describe('useKanbanKeyboard: lift state', () => {
	it('lifts and drops a card on Space', () => {
		const { result } = renderHook(() =>
			useKanbanKeyboard<Card, Column>({
				columns: makeColumns(),
				getItemKey: (i) => i.id,
			}),
		)

		expect(result.current.liftedCardId).toBeNull()

		act(() => {
			result.current.onCardKeyDown('a1', makeEvent(' '))
		})

		expect(result.current.liftedCardId).toBe('a1')

		act(() => {
			result.current.onCardKeyDown('a1', makeEvent(' '))
		})

		expect(result.current.liftedCardId).toBeNull()
	})

	it('ignores modifier keys', () => {
		const { result } = renderHook(() =>
			useKanbanKeyboard<Card, Column>({
				columns: makeColumns(),
				getItemKey: (i) => i.id,
			}),
		)

		act(() => {
			result.current.onCardKeyDown('a1', makeEvent(' ', { shiftKey: true }))
		})

		expect(result.current.liftedCardId).toBeNull()
	})

	it('clears liftedCardId on Escape', () => {
		const { result } = renderHook(() =>
			useKanbanKeyboard<Card, Column>({
				columns: makeColumns(),
				getItemKey: (i) => i.id,
			}),
		)

		act(() => {
			result.current.onCardKeyDown('a1', makeEvent(' '))
		})

		act(() => {
			result.current.onCardKeyDown('a1', makeEvent('Escape'))
		})

		expect(result.current.liftedCardId).toBeNull()
	})

	it('clears liftedCardId on blur', () => {
		const { result } = renderHook(() =>
			useKanbanKeyboard<Card, Column>({
				columns: makeColumns(),
				getItemKey: (i) => i.id,
			}),
		)

		act(() => {
			result.current.onCardKeyDown('a1', makeEvent(' '))
		})

		expect(result.current.liftedCardId).toBe('a1')

		act(() => {
			result.current.onCardBlur()
		})

		expect(result.current.liftedCardId).toBeNull()
	})
})

describe('useKanbanKeyboard: focus navigation', () => {
	beforeEach(() => {
		const cards = ['a1', 'a2', 'b1']

		for (const id of cards) {
			const el = document.createElement('div')

			el.setAttribute('data-slot', 'kanban-card')
			el.setAttribute('data-card-id', id)
			el.setAttribute('tabindex', '0')

			document.body.appendChild(el)
		}
	})

	afterEach(() => {
		document.body.innerHTML = ''
	})

	it('moves focus to the next card in the column on ArrowDown', () => {
		const { result } = renderHook(() =>
			useKanbanKeyboard<Card, Column>({
				columns: makeColumns(),
				getItemKey: (i) => i.id,
			}),
		)

		const event = makeEvent('ArrowDown')

		act(() => {
			result.current.onCardKeyDown('a1', event)
		})

		expect(event.preventDefault).toHaveBeenCalled()

		expect(document.activeElement?.getAttribute('data-card-id')).toBe('a2')
	})

	it('moves focus to the previous card in the column on ArrowUp', () => {
		const { result } = renderHook(() =>
			useKanbanKeyboard<Card, Column>({
				columns: makeColumns(),
				getItemKey: (i) => i.id,
			}),
		)

		act(() => {
			result.current.onCardKeyDown('a2', makeEvent('ArrowUp'))
		})

		expect(document.activeElement?.getAttribute('data-card-id')).toBe('a1')
	})

	it('moves focus to the first card on Home', () => {
		const { result } = renderHook(() =>
			useKanbanKeyboard<Card, Column>({
				columns: makeColumns(),
				getItemKey: (i) => i.id,
			}),
		)

		act(() => {
			result.current.onCardKeyDown('a2', makeEvent('Home'))
		})

		expect(document.activeElement?.getAttribute('data-card-id')).toBe('a1')
	})

	it('moves focus to the last card on End', () => {
		const { result } = renderHook(() =>
			useKanbanKeyboard<Card, Column>({
				columns: makeColumns(),
				getItemKey: (i) => i.id,
			}),
		)

		act(() => {
			result.current.onCardKeyDown('a1', makeEvent('End'))
		})

		expect(document.activeElement?.getAttribute('data-card-id')).toBe('a2')
	})

	it('moves focus to the next column on ArrowRight', () => {
		const { result } = renderHook(() =>
			useKanbanKeyboard<Card, Column>({
				columns: makeColumns(),
				getItemKey: (i) => i.id,
			}),
		)

		act(() => {
			result.current.onCardKeyDown('a1', makeEvent('ArrowRight'))
		})

		expect(document.activeElement?.getAttribute('data-card-id')).toBe('b1')
	})

	it('does nothing when moving to an empty column', () => {
		const { result } = renderHook(() =>
			useKanbanKeyboard<Card, Column>({
				columns: makeColumns(),
				getItemKey: (i) => i.id,
			}),
		)

		const event = makeEvent('ArrowRight')

		act(() => {
			result.current.onCardKeyDown('b1', event)
		})

		expect(event.preventDefault).not.toHaveBeenCalled()
	})

	it('does nothing when moving left from the first column', () => {
		const { result } = renderHook(() =>
			useKanbanKeyboard<Card, Column>({
				columns: makeColumns(),
				getItemKey: (i) => i.id,
			}),
		)

		const event = makeEvent('ArrowLeft')

		act(() => {
			result.current.onCardKeyDown('a1', event)
		})

		expect(event.preventDefault).not.toHaveBeenCalled()
	})

	it('returns false when the card id is not found', () => {
		const { result } = renderHook(() =>
			useKanbanKeyboard<Card, Column>({
				columns: makeColumns(),
				getItemKey: (i) => i.id,
			}),
		)

		const event = makeEvent('ArrowDown')

		act(() => {
			result.current.onCardKeyDown('unknown', event)
		})

		expect(event.preventDefault).not.toHaveBeenCalled()
	})
})

describe('useKanbanKeyboard: reordering a lifted card', () => {
	it('calls onChange to move the card down within its column on ArrowDown', () => {
		const onChange = vi.fn()

		const { result } = renderHook(() =>
			useKanbanKeyboard<Card, Column>({
				columns: makeColumns(),
				getItemKey: (i) => i.id,
				onChange,
			}),
		)

		act(() => {
			result.current.onCardKeyDown('a1', makeEvent(' '))
		})

		act(() => {
			result.current.onCardKeyDown('a1', makeEvent('ArrowDown'))
		})

		expect(onChange).toHaveBeenCalledOnce()

		const next = onChange.mock.calls[0]?.[0] as Column[]

		expect(next[0]?.items.map((i) => i.id)).toEqual(['a2', 'a1'])
	})

	it('does not call onChange when moving past the end of a column', () => {
		const onChange = vi.fn()

		const { result } = renderHook(() =>
			useKanbanKeyboard<Card, Column>({
				columns: makeColumns(),
				getItemKey: (i) => i.id,
				onChange,
			}),
		)

		act(() => {
			result.current.onCardKeyDown('a2', makeEvent(' '))
		})

		act(() => {
			result.current.onCardKeyDown('a2', makeEvent('ArrowDown'))
		})

		expect(onChange).not.toHaveBeenCalled()
	})

	it('moves a card to the next column on ArrowRight when lifted', () => {
		const onChange = vi.fn()

		const { result } = renderHook(() =>
			useKanbanKeyboard<Card, Column>({
				columns: makeColumns(),
				getItemKey: (i) => i.id,
				onChange,
			}),
		)

		act(() => {
			result.current.onCardKeyDown('a1', makeEvent(' '))
		})

		act(() => {
			result.current.onCardKeyDown('a1', makeEvent('ArrowRight'))
		})

		const next = onChange.mock.calls[0]?.[0] as Column[]

		expect(next[0]?.items.map((i) => i.id)).toEqual(['a2'])

		expect(next[1]?.items.map((i) => i.id)).toEqual(['b1', 'a1'])
	})

	it('does not call onChange when moving out of bounds between columns', () => {
		const onChange = vi.fn()

		const { result } = renderHook(() =>
			useKanbanKeyboard<Card, Column>({
				columns: makeColumns(),
				getItemKey: (i) => i.id,
				onChange,
			}),
		)

		act(() => {
			result.current.onCardKeyDown('a1', makeEvent(' '))
		})

		act(() => {
			result.current.onCardKeyDown('a1', makeEvent('ArrowLeft'))
		})

		expect(onChange).not.toHaveBeenCalled()
	})

	it('is a no-op when onChange is not provided', () => {
		const { result } = renderHook(() =>
			useKanbanKeyboard<Card, Column>({
				columns: makeColumns(),
				getItemKey: (i) => i.id,
			}),
		)

		act(() => {
			result.current.onCardKeyDown('a1', makeEvent(' '))
		})

		expect(() =>
			act(() => {
				result.current.onCardKeyDown('a1', makeEvent('ArrowDown'))
			}),
		).not.toThrow()
	})
})
