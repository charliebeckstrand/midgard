// @vitest-environment jsdom
import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useGame } from '../hooks/use-game'
import { createGame, SLOTS } from '../utilities/game'

afterEach(cleanup)

/** The deck of the seed `charlie`. */
const deck = createGame('charlie').deck

/** The slot of `value` in the end state of the run: its rank in the deck. */
const findRank = (value: number) => [...deck].sort((a, b) => a - b).indexOf(value)

describe('useGame', () => {
	it('waits for a draw when Auto-draw is off', () => {
		const { result } = renderHook(() => useGame('charlie', false))

		expect(result.current.status).toBe('ready')

		act(() => result.current.draw())

		expect(result.current.game.drawn).toBe(deck[0])
		expect(result.current.status).toBe('placing')
	})

	it('does not draw after a placement when Auto-draw is off', () => {
		const { result } = renderHook(() => useGame('charlie', false))

		act(() => result.current.draw())
		act(() => result.current.place(findRank(deck[0] ?? 0)))

		expect(result.current.game.drawn).toBeNull()
		expect(result.current.status).toBe('ready')
	})

	it('draws at the mount when Auto-draw is on', () => {
		const { result } = renderHook(() => useGame('charlie', true))

		expect(result.current.game.drawn).toBe(deck[0])
	})

	it('draws when the setting comes on, and not again when it goes off', () => {
		const { result, rerender } = renderHook(({ autoDraw }) => useGame('charlie', autoDraw), {
			initialProps: { autoDraw: false },
		})

		rerender({ autoDraw: true })

		expect(result.current.game.drawn).toBe(deck[0])

		rerender({ autoDraw: false })

		expect(result.current.game.drawn).toBe(deck[0])
	})

	it('does not draw when the setting comes on while a number waits', () => {
		const { result, rerender } = renderHook(({ autoDraw }) => useGame('charlie', autoDraw), {
			initialProps: { autoDraw: false },
		})

		act(() => result.current.draw())

		rerender({ autoDraw: true })

		expect(result.current.game.drawn).toBe(deck[0])
		expect(result.current.game.last).toBe(deck[0])
	})

	it('draws the next number in the update of a placement when Auto-draw is on', () => {
		const { result } = renderHook(() => useGame('charlie', true))

		act(() => result.current.place(findRank(deck[0] ?? 0)))

		expect(result.current.game.drawn).toBe(deck[1])
		expect(result.current.game.slots.filter((slot) => slot !== null)).toEqual([deck[0]])
	})

	it('draws the first number of the new seed after a reset when Auto-draw is on', () => {
		const { result } = renderHook(() => useGame('charlie', true))

		act(() => result.current.reset('k3x9q2'))

		expect(result.current.game.seed).toBe('k3x9q2')
		expect(result.current.game.drawn).toBe(createGame('k3x9q2').deck[0])
	})

	it('starts a new run at each reset, also of the same seed', () => {
		const { result } = renderHook(() => useGame('charlie', false))

		expect(result.current.run).toBe(0)

		act(() => result.current.draw())
		act(() => result.current.reset('charlie'))

		expect(result.current.run).toBe(1)
		expect(result.current.game.last).toBeNull()

		act(() => result.current.draw())

		expect(result.current.run).toBe(1)
	})

	it('does not draw after a reset when Auto-draw is off', () => {
		const { result } = renderHook(() => useGame('charlie', false))

		act(() => result.current.draw())
		act(() => result.current.reset('k3x9q2'))

		expect(result.current.game.drawn).toBeNull()
		expect(result.current.status).toBe('ready')
	})

	it('does not draw after the last placement when Auto-draw is on', () => {
		const { result } = renderHook(() => useGame('charlie', true))

		for (const value of deck) act(() => result.current.place(findRank(value)))

		expect(result.current.status).toBe('won')
		expect(result.current.game.drawn).toBeNull()
		expect(result.current.game.slots.every((slot) => slot !== null)).toBe(true)
		expect(deck).toHaveLength(SLOTS)
	})

	it('gives the run to onEnd once when it ends in a win', () => {
		const onEnd = vi.fn()

		const { result } = renderHook(() => useGame('charlie', true, onEnd))

		for (const value of deck) act(() => result.current.place(findRank(value)))

		expect(onEnd).toHaveBeenCalledTimes(1)
		expect(onEnd.mock.calls[0]?.[0].slots.every((slot: number | null) => slot !== null)).toBe(true)
	})

	it('gives the run to onEnd when a draw ends it in a bust', () => {
		// A seed whose second number is smaller than its first, so the first in the
		// lowest slot leaves the second no slot.
		const seed = ['a', 'b', 'c', 'd', 'e', 'f'].find((name) => {
			const [first = 0, second = 0] = createGame(name).deck

			return second < first
		})

		const onEnd = vi.fn()

		const { result } = renderHook(() => useGame(seed ?? '', true, onEnd))

		act(() => result.current.place(0))

		expect(result.current.status).toBe('bust')
		expect(onEnd).toHaveBeenCalledTimes(1)
	})

	it('does not give a run to onEnd that has not ended', () => {
		const onEnd = vi.fn()

		const { result } = renderHook(() => useGame('charlie', true, onEnd))

		act(() => result.current.place(findRank(deck[0] ?? 0)))

		act(() => result.current.reset('other'))

		expect(onEnd).not.toHaveBeenCalled()
	})
})
