'use client'

import type { User } from 'auth'
import { useEffect, useRef } from 'react'
import { useToday } from 'ui/hooks'
import { useToast } from 'ui/toast'
import type { Mode } from '../api/stats-api'
import { useStats } from '../queries/stats-queries'
import { type Game, getStatus, isEnded, SLOTS } from '../utilities/game'
import { dailySeed } from '../utilities/seed'

/**
 * Tells the reader, in a toast, that the daily puzzle of today already counts,
 * when a run of it starts after its first run counted. The toast gives the
 * score of the first run: a replay counts as a run, but it does not change the
 * streak. The stats are those of `user`, so a reader with no session or with
 * no verified email gets no toast.
 *
 * Each run gets one decision. The decision waits for the stats, and it uses
 * only stats that the run itself did not change: when the run ends before the
 * stats arrive, its result can be in them, so the run gets no toast.
 */
export function useDailyNotice(game: Game, run: number, mode: Mode, user: User | undefined) {
	const today = useToday()

	const daily = today ? dailySeed(today) : ''

	const isDaily = game.seed === daily

	const { data } = useStats(daily, isDaily && user?.is_verified === true)

	const { toast } = useToast()

	const status = getStatus(game)

	const ended = isEnded(status)

	// The last run that got its decision. The page starts with run 0, and at the
	// mount the effect of the address in `GameBoard` starts the run of the
	// address again as run 1, before the reader can play. Thus run 0 is never a
	// run that the reader opens, and it gets no decision. Without this, a run
	// that opens with the stats in the cache gets a toast for run 0 and a
	// second toast for run 1.
	const decided = useRef(0)

	useEffect(() => {
		if (!isDaily || decided.current === run) return

		if (ended) {
			decided.current = run

			return
		}

		if (!data) return

		decided.current = run

		const score = data[mode].dailyScore

		if (score === null) return

		toast({
			title: "You already played today's puzzle",
			description: `Your score of ${score} / ${SLOTS} is saved. This replay won't change your streak.`,
		})
	}, [isDaily, run, ended, data, mode, toast])
}
