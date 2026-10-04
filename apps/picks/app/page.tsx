import { requireGateway, requireSession } from 'auth'
import { Suspense } from 'react'
import { Container } from 'ui/structure/container'
import { PicksHeader } from '@/components/picks-header'
import { ScheduleList } from '@/components/schedule-list'
import { mimir } from '@/server/mimir'
import { getSchedule, getWeekGames } from '@/server/scoreboard'
import type { Schedule } from '@/types'
import { kickedOff } from '@/utilities/locks'

/**
 * The page reads the session and the picks of the user before it renders, so
 * the buttons of each week show their true state on the first frame.
 */
export const instant = false

/**
 * The weeks that have kicked off. The dates of a week answer for every week
 * but the current one, so only the games of that week are read.
 */
async function startedWeeks(schedule: Schedule, now: number): Promise<number[]> {
	const started: number[] = []

	for (const week of schedule.weeks) {
		if (Date.parse(week.start) > now) continue

		if (
			Date.parse(week.end) < now ||
			kickedOff(await getWeekGames(schedule.season, week.number), now)
		) {
			started.push(week.number)
		}
	}

	return started
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

	const picks =
		(await requireGateway('/api/predictions', () =>
			mimir.GET('/api/predictions/{season}', { params: { path: { season: schedule.season } } }),
		)) ?? {}

	const started = await startedWeeks(schedule, Date.now())

	return (
		<>
			<PicksHeader user={user} />

			<Container className="p-6">
				<Suspense>
					<ScheduleList
						season={schedule.season}
						weeks={schedule.weeks}
						picks={picks}
						started={started}
					/>
				</Suspense>
			</Container>
		</>
	)
}
