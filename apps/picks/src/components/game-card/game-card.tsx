import { Card } from 'ui/card'
import { cn } from 'ui/core'
import { Flex } from 'ui/structure/flex'
import { Stack } from 'ui/structure/stack'
import type { Game, Team } from '../../types'
import type { Grade } from '../../utilities/grade'

/** The outline of a card for each grade of its pick. A card with no grade keeps the default. */
const GRADE_OUTLINE = {
	right: 'outline-2 outline-green-500',
	wrong: 'outline-2 outline-red-500',
} as const

/** The kickoff of a game that has not started, in the time zone of the reader. */
const kickoffFormat = new Intl.DateTimeFormat('en-US', {
	weekday: 'short',
	hour: 'numeric',
	minute: '2-digit',
})

/**
 * One side of a game: the logo on the left, the name, and the score on the
 * right. In a final game the score of the winner is bold and the score of the
 * loser is muted.
 */
function TeamRow({ team, final }: { team: Team; final: boolean }) {
	const lost = final && !team.winner

	return (
		<Flex align="center" gap="md">
			{team.logo === null ? (
				<span aria-hidden="true" className="size-8 shrink-0" />
			) : (
				<img src={team.logo} alt="" className="size-8 shrink-0" />
			)}

			<span className={cn('min-w-0 flex-1 truncate', lost && 'text-zinc-500 dark:text-zinc-400')}>
				{team.name}
			</span>

			<span
				className={cn(
					'tabular-nums',
					final && team.winner && 'font-bold',
					lost && 'text-zinc-500 dark:text-zinc-400',
				)}
			>
				{team.score ?? ''}
			</span>
		</Flex>
	)
}

/**
 * One game of a week: the away team over the home team. The outline is green
 * where the pick was right and red where it was wrong.
 */
export function GameCard({ game, grade }: { game: Game; grade: Grade }) {
	const final = game.state === 'final'

	return (
		<Card className={cn(grade === null ? undefined : GRADE_OUTLINE[grade])}>
			<Stack gap="sm">
				<TeamRow team={game.away} final={final} />

				<TeamRow team={game.home} final={final} />

				{game.state === 'scheduled' ? (
					<time dateTime={game.kickoff} className="text-sm text-zinc-500 dark:text-zinc-400">
						{kickoffFormat.format(new Date(game.kickoff))}
					</time>
				) : null}
			</Stack>
		</Card>
	)
}
