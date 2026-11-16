'use client'

import type { User } from 'auth'
import type { Mode } from '../api/stats-api'
import { useRecordResult } from '../queries/stats-queries'
import { countPlaced, type Game } from '../utilities/game'
import { dailySeed } from '../utilities/seed'

/**
 * Gives the function that counts a finished run toward the stats of `user`.
 * The score is the count of the filled slots, and the date is the date of the
 * reader. A run counts only for a user with a verified email, because the
 * gateway refuses the write of any other reader.
 */
export function useRunRecorder(user: User | undefined, mode: Mode): (game: Game) => void {
	const { mutate } = useRecordResult()

	return (game) => {
		if (!user?.is_verified) return

		mutate({
			seed: game.seed,
			score: countPlaced(game.slots),
			mode,
			today: dailySeed(new Date()),
		})
	}
}
