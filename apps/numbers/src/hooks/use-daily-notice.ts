'use client'

import type { User } from 'auth'
import { useState } from 'react'
import type { Seed } from 'shared/queries'
import { useToday } from 'ui/hooks'
import type { Mode, NumbersStats } from '../api/stats-api'
import { useStats } from '../queries/stats-queries'
import { type Game, getStatus, isEnded } from '../utilities/game'
import { dailySeed } from '../utilities/seed'

/** The stats that the server read for the daily puzzle of the page (see `readDailyStats`). */
export type ServerStats = {
	/** The day of the reader on the server, as the seed of its daily puzzle (`YYYYMMDD`). */
	today: string
	/** The stats of the reader as of `today`. */
	stats: Seed<NumbersStats>
}

/** The decision of one run: whether the run gets the notice. */
type Decision = { run: number; notice: boolean }

/**
 * Decides whether the run tells the reader that the daily puzzle of today
 * already counts: a run of it that starts after its first run counted. A
 * replay changes no stat and no leaderboard. The stats are
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
 * notice in its first paint. After a load, the stats that the server read
 * (`server`) give the notice to the server render, and the hydration render
 * makes the same decision. Before the hydration, the browser does not read its
 * own day (`useToday`), so the day is the day of the server. After the
 * hydration, the day of the browser counts. When the server read no stats,
 * such as with no offset cookie, the notice comes with the stats of the
 * browser.
 *
 * @param server - The stats that the server read for the daily puzzle of the
 * page, if any.
 * @returns Whether this run gets the notice.
 */
export function useDailyNotice(
	game: Game,
	run: number,
	mode: Mode,
	user: User | undefined,
	server?: ServerStats,
): boolean {
	const today = useToday()

	const daily = today ? dailySeed(today) : (server?.today ?? '')

	const isDaily = game.seed === daily

	const { data } = useStats(
		daily,
		isDaily && user?.is_verified === true,
		server?.today === daily ? server.stats : undefined,
	)

	const ended = isEnded(getStatus(game))

	const [decision, setDecision] = useState<Decision | null>(null)

	// A set in the render renders again before the commit, and the next render
	// finds the decision of the run, so it sets no more.
	if (isDaily && decision?.run !== run && (ended || data)) {
		setDecision({ run, notice: !ended && data?.[mode].dailyScore != null })
	}

	return isDaily && decision?.run === run && decision.notice
}
