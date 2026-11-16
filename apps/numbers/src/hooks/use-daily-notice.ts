'use client'

import type { User } from 'auth'
import { useState } from 'react'
import { useToday } from 'ui/hooks'
import type { Mode } from '../api/stats-api'
import { useStats } from '../queries/stats-queries'
import { type Game, getStatus, isEnded } from '../utilities/game'
import { dailySeed } from '../utilities/seed'

/** The decision of one run: whether the run gets the notice. */
type Decision = { run: number; notice: boolean }

/**
 * Decides whether the run tells the reader that the daily puzzle of today
 * already counts: a run of it that starts after its first run counted. A
 * replay counts as a run, but it does not change the streak. The stats are
 * those of `user`, so a reader with no session or with no verified email gets
 * no notice.
 *
 * Each run gets one decision. The decision waits for the stats, and it uses
 * only stats that the run itself did not change: when the run ends before the
 * stats arrive, its result can be in them, so the run gets no notice.
 *
 * @remarks
 * The decision is made in the render, and not in an effect. Thus a run whose
 * stats are in the cache, such as a run that the header menu opens, has the
 * notice in its first paint. The day of the reader is not known before
 * hydration (`useToday`), so after a load the notice comes with the stats.
 *
 * @returns Whether this run gets the notice.
 */
export function useDailyNotice(
	game: Game,
	run: number,
	mode: Mode,
	user: User | undefined,
): boolean {
	const today = useToday()

	const daily = today ? dailySeed(today) : ''

	const isDaily = game.seed === daily

	const { data } = useStats(daily, isDaily && user?.is_verified === true)

	const ended = isEnded(getStatus(game))

	const [decision, setDecision] = useState<Decision | null>(null)

	// A set in the render renders again before the commit, and the next render
	// finds the decision of the run, so it sets no more.
	if (isDaily && decision?.run !== run && (ended || data)) {
		setDecision({ run, notice: !ended && data?.[mode].dailyScore != null })
	}

	return isDaily && decision?.run === run && decision.notice
}
