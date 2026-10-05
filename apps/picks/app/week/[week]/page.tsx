import { requireSession } from 'auth'
import { notFound } from 'next/navigation'
import { Container } from 'ui/structure/container'
import { Text } from 'ui/text'
import { GameCard, GameGrid } from '@/components/game-card'
import { LiveRefresh } from '@/components/live-refresh'
import { PicksHeader } from '@/components/picks-header'
import { TallyTotal } from '@/components/tally-total'
import { getSeasonPicks } from '@/server/mimir'
import { getSchedule, getWeekGames } from '@/server/scoreboard'
import { tallyWeek } from '@/utilities/grade'
import { weekClosed } from '@/utilities/locks'

/** The page reads the session and the picks of the user before it renders. */
export const instant = false

/**
 * One week: the record and the points of the week, where a pick is graded,
 * over a card for each game. A week that takes no more picks and has none
 * says so.
 */
export default async function WeekPage({ params }: { params: Promise<{ week: string }> }) {
	const { user } = await requireSession()

	const [{ week: segment }, schedule] = await Promise.all([params, getSchedule()])

	const week = schedule.weeks.find((entry) => String(entry.number) === segment)

	if (week === undefined) notFound()

	const [games, picks] = await Promise.all([
		getWeekGames(schedule.season, week.number),
		getSeasonPicks(schedule.season),
	])

	const weekPicks = picks[week.number] ?? {}

	const skipped = Object.keys(weekPicks).length === 0 && weekClosed(games, Date.now())

	return (
		<>
			<PicksHeader user={user} week={week.label} />

			<LiveRefresh live={games.some((game) => game.state === 'live')} />

			<Container size="full" padding="lg" className="p-6">
				{games.length === 0 ? (
					<Text tone="muted">No games this week.</Text>
				) : (
					<>
						<TallyTotal tally={tallyWeek(games, weekPicks)} className="mb-6" />

						{skipped ? (
							<Text tone="muted" className="mb-6">
								No picks this week.
							</Text>
						) : null}

						<GameGrid>
							{games.map((game) => (
								<GameCard key={game.id} game={game} pick={weekPicks[game.id]} />
							))}
						</GameGrid>
					</>
				)}
			</Container>
		</>
	)
}
