// @vitest-environment jsdom
import { renderHook } from '@testing-library/react'
import type { User } from 'auth'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useRunRecorder } from '../hooks/use-run-recorder'
import { createGame, drawNumber, placeNumber, playCpu, SLOTS } from '../utilities/game'

const { mutate } = vi.hoisted(() => ({ mutate: vi.fn() }))

vi.mock('../queries/stats-queries', () => ({ useRecordResult: () => ({ mutate }) }))

/** A run of the seed `charlie` with its first number in the first slot. */
const game = placeNumber(drawNumber(createGame('charlie')), 0)

/** A user, verified or not. */
const makeUser = (verified: boolean) => ({ id: 'user-1', is_verified: verified }) as User

beforeEach(() => {
	vi.useFakeTimers({ toFake: ['Date'] })

	vi.setSystemTime(new Date(2026, 10, 16, 12))
})

afterEach(() => {
	vi.useRealTimers()

	vi.clearAllMocks()
})

describe('useRunRecorder', () => {
	it('sends the solo run of a verified user, with its score, mode, and date', () => {
		const { result } = renderHook(() => useRunRecorder(makeUser(true), 'solo', 'normal'))

		result.current(game)

		expect(mutate).toHaveBeenCalledWith({
			seed: 'charlie',
			score: 1,
			mode: 'solo',
			today: '20261116',
		})
	})

	// The ended run of the hard CPU on `abc` fills 15 slots, and the easy CPU 8.
	// The same game at the same level is a tie. On `charlie`, hard fills 9 and
	// easy 12.
	it.each([
		['a win', playCpu('abc', SLOTS, 'hard'), 'easy', true],
		['a tie', playCpu('abc', SLOTS, 'hard'), 'hard', false],
		['a loss', playCpu('charlie', SLOTS, 'hard'), 'easy', false],
		['a run that a Reset ends', game, 'easy', false],
	] as const)('sends whether a vs CPU run beat the CPU: %s', (_, run, difficulty, beatCpu) => {
		const { result } = renderHook(() => useRunRecorder(makeUser(true), 'vsCpu', difficulty))

		result.current(run)

		expect(mutate).toHaveBeenCalledWith(expect.objectContaining({ mode: 'vsCpu', beatCpu }))
	})

	it('sends nothing for a user with no verified email, or for no user', () => {
		renderHook(() => useRunRecorder(makeUser(false), 'solo', 'normal')).result.current(game)

		renderHook(() => useRunRecorder(undefined, 'solo', 'normal')).result.current(game)

		expect(mutate).not.toHaveBeenCalled()
	})
})
