import { requireSession } from 'auth'
import { Suspense } from 'react'
import { seed } from 'shared/queries'
import { Container } from 'ui/structure/container'
import { PicksHeader } from '@/components/picks-header'
import { type ClosingWeek, ScheduleList } from '@/components/schedule-list'
import { TallyTotal } from '@/components/tally-total'
import { getSeasonPicks } from '@/server/mimir'
import { getSchedule, getWeekGames } from '@/server/scoreboard'
import type { Schedule, SeasonPicks } from '@/types'
import { addTally, EMPTY_TALLY, type Tally, tallyWeek } from '@/utilities/grade'
import { kickedOff, weekClosed } from '@/utilities/locks'

/** How long before its first kickoff the next week reads as closing soon: a day. */
const CLOSING_SOON = 24 * 60 * 60 * 1000

/**
 * The page reads the session and the picks of the user before it renders, so
 * the buttons of each week show their true state on the first frame.
 */
export const instant = false

/**
 * The weeks that have kicked off, the weeks that take no more picks, and the
 * week in play or next up. The dates of a week answer for every week but the
 * current one, so only the games of that week are read.
 */
async function seasonState(
	schedule: Schedule,
	now: number,
): Promise<{ started: number[]; closed: number[]; current: number | null }> {
	const ended = schedule.weeks
		.filter((week) => Date.parse(week.end) < now)
		.map((week) => week.number)

	const current = schedule.weeks.find((week) => Date.parse(week.end) >= now)

	if (current === undefined) return { started: ended, closed: ended, current: null }

	const games = await getWeekGames(schedule.season, current.number)

	const started = Date.parse(current.start) <= now && kickedOff(games, now)

	return {
		started: started ? [...ended, current.number] : ended,
		closed: weekClosed(games, now) ? [...ended, current.number] : ended,
		current: current.number,
	}
}

/**
 * The next week to kick off, with its first kickoff, when that kickoff is
 * within {@link CLOSING_SOON}. The picks of the week start to lock then.
 */
async function closingWeek(
	schedule: Schedule,
	started: number[],
	now: number,
): Promise<ClosingWeek | null> {
	const week = schedule.weeks.find((entry) => !started.includes(entry.number))

	if (week === undefined) return null

	const [first] = (await getWeekGames(schedule.season, week.number))
		.map((game) => game.kickoff)
		.sort((a, b) => Date.parse(a) - Date.parse(b))

	if (first === undefined || Date.parse(first) - now > CLOSING_SOON) return null

	return { week: week.number, kickoff: first }
}

/** The tally of each started week that has a prediction, by week number. */
async function weekTallies(
	season: number,
	picks: SeasonPicks,
	started: number[],
): Promise<Record<number, Tally>> {
	const entries = await Promise.all(
		started.flatMap((week) => {
			const weekPicks = picks[week]

			if (weekPicks === undefined) return []

			return [
				getWeekGames(season, week).then((games) => [week, tallyWeek(games, weekPicks)] as const),
			]
		}),
	)

	return Object.fromEntries(entries)
}

/**
 * The schedule: the weeks of the regular season, each with the buttons of its
 * prediction.
 *
 * The boundary is what `useSearchParams` asks of a page that prerenders. The
 * list reads `?predict=` to open the form.
 */
export default async function Page() {
	const { user } = await requireSession()

	const schedule = await getSchedule()

	const picks = await getSeasonPicks(schedule.season)

	const now = Date.now()

	const { started, closed, current } = await seasonState(schedule, now)

	const [tallies, closing] = await Promise.all([
		weekTallies(schedule.season, picks, started),
		closingWeek(schedule, started, now),
	])

	const season = Object.values(tallies).reduce(addTally, EMPTY_TALLY)

	return (
		<>
			<PicksHeader user={user} />

			<Container size="full" padding="lg" className="py-6">
				<Suspense>
					<ScheduleList
						header={<TallyTotal tally={season} />}
						season={schedule.season}
						weeks={schedule.weeks}
						picks={seed(picks)}
						started={started}
						closed={closed}
						current={current}
						closing={closing}
						tallies={tallies}
					/>
				</Suspense>
			</Container>
		</>
	)
}
