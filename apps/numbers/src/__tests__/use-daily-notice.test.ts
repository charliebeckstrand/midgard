// @vitest-environment jsdom
import { renderHook } from '@testing-library/react'
import type { User } from 'auth'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { NumbersStats } from '../api/stats-api'
import { useDailyNotice } from '../hooks/use-daily-notice'
import { createGame, drawNumber, type Game, getStatus, placeNumber } from '../utilities/game'

const { useStats } = vi.hoisted(() => ({
	useStats: vi.fn<(today: string, enabled: boolean) => { data: NumbersStats | undefined }>(),
}))

vi.mock('../queries/stats-queries', () => ({ useStats }))

const TODAY = '20261116'

/** A user, verified or not. */
const makeUser = (verified: boolean) => ({ id: 'user-1', is_verified: verified }) as User

/** The stats with `dailyScore` in each mode. */
const statsWith = (dailyScore: number | null) => {
	const mode = {
		played: 1,
		wins: 0,
		best: 4,
		average: 4,
		scores: [],
		streak: 1,
		bestStreak: 1,
		dailyScore,
		winRate: null,
	}

	return { solo: mode, vsCpu: mode }
}

/** A run of the seed `seed` that goes on. */
const playing = (seed: string) => drawNumber(createGame(seed))

/** A run that ended in a bust: 1 waits, and only the first slot is filled, with 999. */
const busted = (seed: string): Game => ({
	...createGame(seed),
	slots: [999, ...Array.from({ length: 19 }, () => null)],
	drawn: 1,
})

type Props = { game: Game; run: number; user?: User }

const render = (props: Props) =>
	renderHook(({ game, run, user }: Props) => useDailyNotice(game, run, 'solo', user), {
		initialProps: props,
	})

beforeEach(() => {
	vi.useFakeTimers({ toFake: ['Date'] })

	vi.setSystemTime(new Date(2026, 10, 16, 12))
})

afterEach(() => {
	vi.useRealTimers()

	vi.clearAllMocks()
})

describe('useDailyNotice', () => {
	it('gives the notice to each run of a daily puzzle that already counts', () => {
		useStats.mockReturnValue({ data: statsWith(14) })

		const user = makeUser(true)

		const { result, rerender } = render({ game: playing(TODAY), run: 1, user })

		expect(useStats).toHaveBeenCalledWith(TODAY, true, undefined)

		expect(result.current).toBe(true)

		rerender({ game: placeNumber(playing(TODAY), 0), run: 1, user })

		expect(result.current).toBe(true)

		rerender({ game: playing(TODAY), run: 2, user })

		expect(result.current).toBe(true)
	})

	it('keeps the decision of the run when the stats change during it', () => {
		useStats.mockReturnValue({ data: statsWith(null) })

		const user = makeUser(true)

		const { result, rerender } = render({ game: playing(TODAY), run: 0, user })

		expect(result.current).toBe(false)

		// The first run ends, and its result is now the saved score.
		useStats.mockReturnValue({ data: statsWith(9) })

		rerender({ game: busted(TODAY), run: 0, user })

		expect(result.current).toBe(false)

		// The next run is a replay.
		rerender({ game: playing(TODAY), run: 1, user })

		expect(result.current).toBe(true)
	})

	it('gives no notice before the first run of the daily puzzle counts', () => {
		useStats.mockReturnValue({ data: statsWith(null) })

		const { result } = render({ game: playing(TODAY), run: 1, user: makeUser(true) })

		expect(result.current).toBe(false)
	})

	it('gives no notice when the stats arrive after the run ended, because they can hold its result', () => {
		useStats.mockReturnValue({ data: undefined })

		const user = makeUser(true)

		const { result, rerender } = render({ game: playing(TODAY), run: 1, user })

		expect(getStatus(busted(TODAY))).toBe('bust')

		rerender({ game: busted(TODAY), run: 1, user })

		useStats.mockReturnValue({ data: statsWith(4) })

		rerender({ game: busted(TODAY), run: 1, user })

		expect(result.current).toBe(false)
	})

	it('reads no stats for another seed, or for a reader with no verified email', () => {
		useStats.mockReturnValue({ data: undefined })

		const results = [
			render({ game: playing('charlie'), run: 1, user: makeUser(true) }).result,
			render({ game: playing(TODAY), run: 1, user: makeUser(false) }).result,
			render({ game: playing(TODAY), run: 1 }).result,
		]

		expect(useStats.mock.calls.every(([, enabled]) => !enabled)).toBe(true)

		expect(results.every((result) => result.current === false)).toBe(true)
	})
})
