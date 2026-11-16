// @vitest-environment jsdom
import { renderHook } from '@testing-library/react'
import type { User } from 'auth'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useRunRecorder } from '../hooks/use-run-recorder'
import { createGame, drawNumber, placeNumber } from '../utilities/game'

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
	it('sends the run of a verified user, with its score, mode, and date', () => {
		const { result } = renderHook(() => useRunRecorder(makeUser(true), 'vsCpu'))

		result.current(game)

		expect(mutate).toHaveBeenCalledWith({
			seed: 'charlie',
			score: 1,
			mode: 'vsCpu',
			today: '20261116',
		})
	})

	it('sends nothing for a user with no verified email, or for no user', () => {
		renderHook(() => useRunRecorder(makeUser(false), 'solo')).result.current(game)

		renderHook(() => useRunRecorder(undefined, 'solo')).result.current(game)

		expect(mutate).not.toHaveBeenCalled()
	})
})
