import { requireGateway, requireSession } from 'auth'
import { Suspense } from 'react'
import { Container } from 'ui/structure/container'
import { PicksHeader } from '@/components/picks-header'
import { ScheduleList } from '@/components/schedule-list'
import { mimir } from '@/server/mimir'
import { getSchedule } from '@/server/scoreboard'

/**
 * The page reads the session and the picks of the user before it renders, so
 * the buttons of each week show their true state on the first frame.
 */
export const instant = false

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

	return (
		<>
			<PicksHeader user={user} />

			<Container className="p-6">
				<Suspense>
					<ScheduleList season={schedule.season} weeks={schedule.weeks} picks={picks} />
				</Suspense>
			</Container>
		</>
	)
}
