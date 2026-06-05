import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useListKeyboard } from '../../components/list/use-list-keyboard'
import { makeKeyEvent } from '../helpers'

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

		document.body.appendChild(el)

		return el
	})
}

describe('useListKeyboard', () => {
	beforeEach(() => {
		document.body.innerHTML = ''
	})

	afterEach(() => {
		document.body.innerHTML = ''
	})

	describe('lift state (Space)', () => {
		it('starts with liftedId null', () => {
			const { result } = renderHook(() =>
				useListKeyboard({
					items: buildItems(['a', 'b', 'c']),
					getKey: (i) => i.id,
					orientation: 'vertical',
				}),
			)

			expect(result.current.liftedId).toBeNull()
		})

		it('Space lifts an item; second Space drops it', () => {
			const { result } = renderHook(() =>
				useListKeyboard({
					items: buildItems(['a', 'b', 'c']),
					getKey: (i) => i.id,
					orientation: 'vertical',
				}),
			)

			const lift = makeKeyEvent(' ')

			act(() => result.current.onItemKeyDown('b', lift))

			expect(result.current.liftedId).toBe('b')
			expect(lift.preventDefault).toHaveBeenCalled()

			const drop = makeKeyEvent(' ')

			act(() => result.current.onItemKeyDown('b', drop))

			expect(result.current.liftedId).toBeNull()
		})

		it('Escape drops the lifted item', () => {
			const { result } = renderHook(() =>
				useListKeyboard({
					items: buildItems(['a', 'b', 'c']),
					getKey: (i) => i.id,
					orientation: 'vertical',
				}),
			)

			act(() => result.current.onItemKeyDown('a', makeKeyEvent(' ')))

			act(() => result.current.onItemKeyDown('a', makeKeyEvent('Escape')))

			expect(result.current.liftedId).toBeNull()
		})

		it('Enter drops the lifted item', () => {
			const { result } = renderHook(() =>
				useListKeyboard({
					items: buildItems(['a', 'b', 'c']),
					getKey: (i) => i.id,
					orientation: 'vertical',
				}),
			)

			act(() => result.current.onItemKeyDown('a', makeKeyEvent(' ')))

			act(() => result.current.onItemKeyDown('a', makeKeyEvent('Enter')))

			expect(result.current.liftedId).toBeNull()
		})
	})

	describe('focus navigation when not lifted', () => {
		it('ArrowDown focuses the next neighbor in vertical orientation', () => {
			const [, b] = mountListDom(['a', 'b', 'c'])

			const { result } = renderHook(() =>
				useListKeyboard({
					items: buildItems(['a', 'b', 'c']),
					getKey: (i) => i.id,
					orientation: 'vertical',
				}),
			)

			const ev = makeKeyEvent('ArrowDown')

			act(() => result.current.onItemKeyDown('a', ev))

			expect(document.activeElement).toBe(b)
			expect(ev.preventDefault).toHaveBeenCalled()
		})

		it('ArrowUp focuses the previous neighbor in vertical orientation', () => {
			const [a] = mountListDom(['a', 'b', 'c'])

			const { result } = renderHook(() =>
				useListKeyboard({
					items: buildItems(['a', 'b', 'c']),
					getKey: (i) => i.id,
					orientation: 'vertical',
				}),
			)

			act(() => result.current.onItemKeyDown('b', makeKeyEvent('ArrowUp')))

			expect(document.activeElement).toBe(a)
		})

		it('ArrowRight focuses the next neighbor in horizontal orientation', () => {
			const [, b] = mountListDom(['a', 'b', 'c'])

			const { result } = renderHook(() =>
				useListKeyboard({
					items: buildItems(['a', 'b', 'c']),
					getKey: (i) => i.id,
					orientation: 'horizontal',
				}),
			)

			act(() => result.current.onItemKeyDown('a', makeKeyEvent('ArrowRight')))

			expect(document.activeElement).toBe(b)
		})

		it('Home focuses the first item', () => {
			const [a] = mountListDom(['a', 'b', 'c'])

			const { result } = renderHook(() =>
				useListKeyboard({
					items: buildItems(['a', 'b', 'c']),
					getKey: (i) => i.id,
					orientation: 'vertical',
				}),
			)

			act(() => result.current.onItemKeyDown('c', makeKeyEvent('Home')))

			expect(document.activeElement).toBe(a)
		})

		it('End focuses the last item', () => {
			const [, , c] = mountListDom(['a', 'b', 'c'])

			const { result } = renderHook(() =>
				useListKeyboard({
					items: buildItems(['a', 'b', 'c']),
					getKey: (i) => i.id,
					orientation: 'vertical',
				}),
			)

			act(() => result.current.onItemKeyDown('a', makeKeyEvent('End')))

			expect(document.activeElement).toBe(c)
		})

		it('does not preventDefault when there is no neighbor in the requested direction', () => {
			mountListDom(['a', 'b', 'c'])

			const { result } = renderHook(() =>
				useListKeyboard({
					items: buildItems(['a', 'b', 'c']),
					getKey: (i) => i.id,
					orientation: 'vertical',
				}),
			)

			const ev = makeKeyEvent('ArrowUp')

			act(() => result.current.onItemKeyDown('a', ev))

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

			const items = buildItems(['a', 'b', 'c'])

			const { result } = renderHook(() =>
				useListKeyboard({ items, getKey: (i) => i.id, orientation: 'vertical', onReorder }),
			)

			act(() => result.current.onItemKeyDown('a', makeKeyEvent(' ')))

			const move = makeKeyEvent('ArrowDown')

			act(() => result.current.onItemKeyDown('a', move))

			expect(move.preventDefault).toHaveBeenCalled()
			expect(onReorder).toHaveBeenCalledTimes(1)
			expect(onReorder.mock.calls[0]?.[0].map((i: Item) => i.id)).toEqual(['b', 'a', 'c'])
		})

		it('ArrowUp moves the lifted item backward', () => {
			const onReorder = vi.fn()

			const { result } = renderHook(() =>
				useListKeyboard({
					items: buildItems(['a', 'b', 'c']),
					getKey: (i) => i.id,
					orientation: 'vertical',
					onReorder,
				}),
			)

			act(() => result.current.onItemKeyDown('c', makeKeyEvent(' ')))

			act(() => result.current.onItemKeyDown('c', makeKeyEvent('ArrowUp')))

			expect(onReorder.mock.calls[0]?.[0].map((i: Item) => i.id)).toEqual(['a', 'c', 'b'])
		})

		it('does not move past the start or end', () => {
			const onReorder = vi.fn()

			const { result } = renderHook(() =>
				useListKeyboard({
					items: buildItems(['a', 'b', 'c']),
					getKey: (i) => i.id,
					orientation: 'vertical',
					onReorder,
				}),
			)

			act(() => result.current.onItemKeyDown('a', makeKeyEvent(' ')))

			act(() => result.current.onItemKeyDown('a', makeKeyEvent('ArrowUp')))

			expect(onReorder).not.toHaveBeenCalled()
		})

		it('does not move when onReorder is not provided', () => {
			const { result } = renderHook(() =>
				useListKeyboard({
					items: buildItems(['a', 'b', 'c']),
					getKey: (i) => i.id,
					orientation: 'vertical',
				}),
			)

			act(() => result.current.onItemKeyDown('a', makeKeyEvent(' ')))

			const ev = makeKeyEvent('ArrowDown')

			act(() => result.current.onItemKeyDown('a', ev))

			// preventDefault still fires (the switch case unconditionally prevents),
			// but no reorder side effect is observable.
			expect(result.current.liftedId).toBe('a')
		})
	})

	describe('modifier keys', () => {
		it('ignores Space when shiftKey is held', () => {
			const { result } = renderHook(() =>
				useListKeyboard({
					items: buildItems(['a', 'b', 'c']),
					getKey: (i) => i.id,
					orientation: 'vertical',
				}),
			)

			act(() => result.current.onItemKeyDown('a', makeKeyEvent(' ', { shiftKey: true })))

			expect(result.current.liftedId).toBeNull()
		})

		it('ignores ArrowDown when ctrlKey is held', () => {
			mountListDom(['a', 'b', 'c'])

			const { result } = renderHook(() =>
				useListKeyboard({
					items: buildItems(['a', 'b', 'c']),
					getKey: (i) => i.id,
					orientation: 'vertical',
				}),
			)

			const ev = makeKeyEvent('ArrowDown', { ctrlKey: true })

			act(() => result.current.onItemKeyDown('a', ev))

			expect(ev.preventDefault).not.toHaveBeenCalled()
		})
	})

	describe('unknown item ids', () => {
		it('does not preventDefault when ArrowDown targets an unknown id', () => {
			const { result } = renderHook(() =>
				useListKeyboard({
					items: buildItems(['a', 'b']),
					getKey: (i) => i.id,
					orientation: 'vertical',
				}),
			)

			const ev = makeKeyEvent('ArrowDown')

			act(() => result.current.onItemKeyDown('ghost', ev))

			expect(ev.preventDefault).not.toHaveBeenCalled()
		})

		it('skips reorder when the lifted id is unknown', () => {
			const onReorder = vi.fn()

			const { result } = renderHook(() =>
				useListKeyboard({
					items: buildItems(['a', 'b', 'c']),
					getKey: (i) => i.id,
					orientation: 'vertical',
					onReorder,
				}),
			)

			act(() => result.current.onItemKeyDown('ghost', makeKeyEvent(' ')))

			act(() => result.current.onItemKeyDown('ghost', makeKeyEvent('ArrowDown')))

			expect(onReorder).not.toHaveBeenCalled()
		})
	})

	describe('onItemBlur', () => {
		it('drops the lifted item when focus leaves outside a reorder', () => {
			const { result } = renderHook(() =>
				useListKeyboard({
					items: buildItems(['a', 'b', 'c']),
					getKey: (i) => i.id,
					orientation: 'vertical',
				}),
			)

			act(() => result.current.onItemKeyDown('a', makeKeyEvent(' ')))

			expect(result.current.liftedId).toBe('a')

			act(() => {
				result.current.onItemBlur()
			})

			expect(result.current.liftedId).toBeNull()
		})
	})
})
