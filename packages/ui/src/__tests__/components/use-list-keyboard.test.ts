import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useListKeyboard } from '../../components/list/use-list-keyboard'
import { attach, makeKeyEvent } from '../helpers'

const containerRef = { current: document.body }

type Item = { id: string }

function buildItems(ids: string[]): Item[] {
	return ids.map((id) => ({ id }))
}

function mountListDom(ids: string[]): HTMLElement[] {
	return ids.map((id) => {
		const el = document.createElement('button')

		el.setAttribute('data-slot', 'list-item')

		el.setAttribute('data-item-id', id)

		el.tabIndex = 0

		return attach(el)
	})
}

function setup(
	options: {
		ids?: string[]
		orientation?: 'vertical' | 'horizontal'
		onReorder?: (next: Item[]) => void
	} = {},
) {
	const { result } = renderHook(() =>
		useListKeyboard({
			containerRef,
			items: buildItems(options.ids ?? ['a', 'b', 'c']),
			getKey: (i) => i.id,
			orientation: options.orientation ?? 'vertical',
			onReorder: options.onReorder,
		}),
	)

	/** Sends one key to an item, inside `act`. */
	const press = (id: string, event: ReturnType<typeof makeKeyEvent>) => {
		act(() => result.current.onItemKeyDown(id, event))
	}

	return { result, press }
}

describe('useListKeyboard', () => {
	describe('lift state (Space)', () => {
		it('Space lifts an item; second Space drops it', () => {
			const { result, press } = setup()

			expect(result.current.liftedId).toBeNull()

			const lift = makeKeyEvent(' ')

			press('b', lift)

			expect(result.current.liftedId).toBe('b')

			expect(lift.preventDefault).toHaveBeenCalled()

			press('b', makeKeyEvent(' '))

			expect(result.current.liftedId).toBeNull()
		})

		it.each(['Escape', 'Enter'])('%s drops the lifted item', (key) => {
			const { result, press } = setup()

			press('a', makeKeyEvent(' '))

			press('a', makeKeyEvent(key))

			expect(result.current.liftedId).toBeNull()
		})
	})

	describe('focus navigation when not lifted', () => {
		it.each<[string, 'vertical' | 'horizontal', string, string, number]>([
			[
				'ArrowDown focuses the next neighbor in vertical orientation',
				'vertical',
				'a',
				'ArrowDown',
				1,
			],
			[
				'ArrowUp focuses the previous neighbor in vertical orientation',
				'vertical',
				'b',
				'ArrowUp',
				0,
			],
			[
				'ArrowRight focuses the next neighbor in horizontal orientation',
				'horizontal',
				'a',
				'ArrowRight',
				1,
			],
			['Home focuses the first item', 'vertical', 'c', 'Home', 0],
			['End focuses the last item', 'vertical', 'a', 'End', 2],
		])('%s', (_name, orientation, from, key, expected) => {
			const nodes = mountListDom(['a', 'b', 'c'])

			const { press } = setup({ orientation })

			const ev = makeKeyEvent(key)

			press(from, ev)

			expect(document.activeElement).toBe(nodes[expected])

			expect(ev.preventDefault).toHaveBeenCalled()
		})

		it('does not preventDefault when there is no neighbor in the requested direction', () => {
			mountListDom(['a', 'b', 'c'])

			const { press } = setup()

			const ev = makeKeyEvent('ArrowUp')

			press('a', ev)

			expect(ev.preventDefault).not.toHaveBeenCalled()
		})
	})

	describe('reorder when lifted', () => {
		beforeEach(() => {
			vi.useFakeTimers()
		})

		afterEach(() => {
			vi.useRealTimers()
		})

		it('ArrowDown moves the lifted item forward and calls onReorder', () => {
			const onReorder = vi.fn()

			const { press } = setup({ onReorder })

			press('a', makeKeyEvent(' '))

			const move = makeKeyEvent('ArrowDown')

			press('a', move)

			expect(move.preventDefault).toHaveBeenCalled()

			expect(onReorder).toHaveBeenCalledTimes(1)

			expect(onReorder.mock.calls[0]?.[0].map((i: Item) => i.id)).toEqual(['b', 'a', 'c'])
		})

		it('ArrowUp moves the lifted item backward', () => {
			const onReorder = vi.fn()

			const { press } = setup({ onReorder })

			press('c', makeKeyEvent(' '))

			press('c', makeKeyEvent('ArrowUp'))

			expect(onReorder.mock.calls[0]?.[0].map((i: Item) => i.id)).toEqual(['a', 'c', 'b'])
		})

		it('does not move past the start or end', () => {
			const onReorder = vi.fn()

			const { press } = setup({ onReorder })

			press('a', makeKeyEvent(' '))

			press('a', makeKeyEvent('ArrowUp'))

			expect(onReorder).not.toHaveBeenCalled()
		})

		it('does not move when onReorder is not provided', () => {
			const { result, press } = setup()

			press('a', makeKeyEvent(' '))

			press('a', makeKeyEvent('ArrowDown'))

			// preventDefault still fires (the switch case unconditionally prevents),
			// but no reorder side effect is observable.
			expect(result.current.liftedId).toBe('a')
		})
	})

	describe('modifier keys', () => {
		it('ignores Space when shiftKey is held', () => {
			const { result, press } = setup()

			press('a', makeKeyEvent(' ', { shiftKey: true }))

			expect(result.current.liftedId).toBeNull()
		})

		it('ignores ArrowDown when ctrlKey is held', () => {
			mountListDom(['a', 'b', 'c'])

			const { press } = setup()

			const ev = makeKeyEvent('ArrowDown', { ctrlKey: true })

			press('a', ev)

			expect(ev.preventDefault).not.toHaveBeenCalled()
		})
	})

	describe('unknown item ids', () => {
		it('does not preventDefault when ArrowDown targets an unknown id', () => {
			const { press } = setup({ ids: ['a', 'b'] })

			const ev = makeKeyEvent('ArrowDown')

			press('ghost', ev)

			expect(ev.preventDefault).not.toHaveBeenCalled()
		})

		it('skips reorder when the lifted id is unknown', () => {
			const onReorder = vi.fn()

			const { press } = setup({ onReorder })

			press('ghost', makeKeyEvent(' '))

			press('ghost', makeKeyEvent('ArrowDown'))

			expect(onReorder).not.toHaveBeenCalled()
		})
	})

	describe('onItemBlur', () => {
		it('drops the lifted item when focus leaves outside a reorder', () => {
			const { result, press } = setup()

			press('a', makeKeyEvent(' '))

			expect(result.current.liftedId).toBe('a')

			act(() => {
				result.current.onItemBlur()
			})

			expect(result.current.liftedId).toBeNull()
		})
	})
})
