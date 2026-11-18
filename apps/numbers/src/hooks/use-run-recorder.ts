'use client'

import type { User } from 'auth'
import type { Mode } from '../api/stats-api'
import { useRecordResult } from '../queries/stats-queries'
import { dayKey } from '../utilities/day'
import {
	countPlaced,
	type Difficulty,
	type Game,
	getOutcome,
	getStatus,
	isEnded,
	playCpu,
	SLOTS,
} from '../utilities/game'

/**
 * Gives the function that counts a finished run toward the stats of `user`.
 * The score is the count of the filled slots, and the date is the date of the
 * reader. A vs CPU run also sends whether it beat the CPU at `difficulty`,
 * because only a win counts on the vs CPU leaderboard. A run that a Reset ends
 * has no outcome, and does not beat the CPU. A run counts only for a user with
 * a verified email, because the gateway refuses the write of any other reader.
 */
export function useRunRecorder(
	user: User | undefined,
	mode: Mode,
	difficulty: Difficulty,
): (game: Game) => void {
	const { mutate } = useRecordResult()

	return (game) => {
		if (!user?.is_verified) return

		const result = {
			seed: game.seed,
			score: countPlaced(game.slots),
			mode,
			today: dayKey(new Date()),
		}

		if (mode === 'solo') {
			mutate(result)

			return
		}

		const beatCpu =
			isEnded(getStatus(game)) && getOutcome(game, playCpu(game.seed, SLOTS, difficulty)) === 'win'

		mutate({ ...result, beatCpu })
	}
}
