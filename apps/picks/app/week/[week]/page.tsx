import { requireGateway, requireSession } from 'auth'
import { notFound } from 'next/navigation'
import { Container } from 'ui/structure/container'
import { Text } from 'ui/text'
import { GameCard } from '@/components/game-card'
import { PicksHeader } from '@/components/picks-header'
import { mimir } from '@/server/mimir'
import { getSchedule, getWeekGames } from '@/server/scoreboard'
import { gradePick } from '@/utilities/grade'

/** The page reads the session and the picks of the user before it renders. */
export const instant = false

/**
 * One week: a card for each game. Where the user made a prediction for the
 * week, the outline of each final game shows whether the pick was right.
 */
export default async function WeekPage({ params }: { params: Promise<{ week: string }> }) {
	const { user } = await requireSession()

	const [{ week: segment }, schedule] = await Promise.all([params, getSchedule()])

	const week = schedule.weeks.find((entry) => String(entry.number) === segment)

	if (week === undefined) notFound()

	const [games, picks] = await Promise.all([
		getWeekGames(schedule.season, week.number),
		requireGateway('/api/predictions', () =>
			mimir.GET('/api/predictions/{season}', { params: { path: { season: schedule.season } } }),
		),
	])

	const weekPicks = picks?.[week.number] ?? {}

	return (
		<>
			<PicksHeader user={user} week={week.label} />

			<Container className="p-6">
				{games.length === 0 ? (
					<Text tone="muted">No games this week.</Text>
				) : (
					<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
						{games.map((game) => (
							<GameCard key={game.id} game={game} grade={gradePick(game, weekPicks[game.id])} />
						))}
					</div>
				)}
			</Container>
		</>
	)
}
