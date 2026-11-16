// @vitest-environment jsdom
import { renderHook } from '@testing-library/react'
import type { User } from 'auth'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { NumbersStats } from '../api/stats-api'
import { useDailyNotice } from '../hooks/use-daily-notice'
import { createGame, drawNumber, type Game, getStatus, placeNumber } from '../utilities/game'

const { useStats, toast } = vi.hoisted(() => ({
	useStats: vi.fn<(today: string, enabled: boolean) => { data: NumbersStats | undefined }>(),
	toast: vi.fn(),
}))

vi.mock('../queries/stats-queries', () => ({ useStats }))

vi.mock('ui/toast', () => ({ useToast: () => ({ toast }) }))

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
	it('tells the reader once for each run of a daily puzzle that already counts', () => {
		useStats.mockReturnValue({ data: statsWith(14) })

		const user = makeUser(true)

		const { rerender } = render({ game: playing(TODAY), run: 1, user })

		expect(useStats).toHaveBeenCalledWith(TODAY, true)

		expect(toast).toHaveBeenCalledTimes(1)

		expect(toast).toHaveBeenCalledWith({
			title: "You already played today's puzzle",
			description: "Your score of 14 / 20 is saved. This replay won't change your streak.",
		})

		rerender({ game: placeNumber(playing(TODAY), 0), run: 1, user })

		expect(toast).toHaveBeenCalledTimes(1)

		rerender({ game: playing(TODAY), run: 2, user })

		expect(toast).toHaveBeenCalledTimes(2)
	})

	it('tells the reader once for run 0, the run that the page opens with', () => {
		useStats.mockReturnValue({ data: statsWith(14) })

		const user = makeUser(true)

		const { rerender } = render({ game: playing(TODAY), run: 0, user })

		expect(toast).toHaveBeenCalledTimes(1)

		rerender({ game: placeNumber(playing(TODAY), 0), run: 0, user })

		expect(toast).toHaveBeenCalledTimes(1)
	})

	it('says nothing before the first run of the daily puzzle counts', () => {
		useStats.mockReturnValue({ data: statsWith(null) })

		render({ game: playing(TODAY), run: 1, user: makeUser(true) })

		expect(toast).not.toHaveBeenCalled()
	})

	it('says nothing when the stats arrive after the run ended, because they can hold its result', () => {
		useStats.mockReturnValue({ data: undefined })

		const user = makeUser(true)

		const { rerender } = render({ game: playing(TODAY), run: 1, user })

		expect(getStatus(busted(TODAY))).toBe('bust')

		rerender({ game: busted(TODAY), run: 1, user })

		useStats.mockReturnValue({ data: statsWith(4) })

		rerender({ game: busted(TODAY), run: 1, user })

		expect(toast).not.toHaveBeenCalled()
	})

	it('reads no stats for another seed, or for a reader with no verified email', () => {
		useStats.mockReturnValue({ data: undefined })

		render({ game: playing('charlie'), run: 1, user: makeUser(true) })

		render({ game: playing(TODAY), run: 1, user: makeUser(false) })

		render({ game: playing(TODAY), run: 1 })

		expect(useStats.mock.calls.every(([, enabled]) => !enabled)).toBe(true)

		expect(toast).not.toHaveBeenCalled()
	})
})
