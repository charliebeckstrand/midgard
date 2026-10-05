import { Card } from 'ui/card'
import { cn } from 'ui/core'
import { Flex } from 'ui/structure/flex'
import { Stack } from 'ui/structure/stack'
import type { Game, Team } from '../../types'
import type { Grade } from '../../utilities/grade'
import { KickoffTime } from '../kickoff-time'

/** The outline of a card for each grade of its pick. A card with no grade keeps the default. */
const GRADE_OUTLINE = {
	right: 'outline-2 outline-green-500',
	wrong: 'outline-2 outline-red-500',
} as const

/** The status line of a game that is off. */
const OFF_LABEL = { postponed: 'Postponed', canceled: 'Canceled' } as const

/** The muted style of the status line of a card. */
const STATUS_CLASS = 'text-sm text-zinc-500 dark:text-zinc-400'

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
 * where the pick was right and red where it was wrong. A game to come shows its
 * kickoff, and a postponed or a canceled game says so.
 */
export function GameCard({ game, grade }: { game: Game; grade: Grade }) {
	const final = game.state === 'final'

	return (
		<Card className={cn(grade === null ? undefined : GRADE_OUTLINE[grade])}>
			<Stack gap="sm">
				<TeamRow team={game.away} final={final} />

				<TeamRow team={game.home} final={final} />

				{game.state === 'scheduled' ? (
					<KickoffTime kickoff={game.kickoff} className={STATUS_CLASS} />
				) : null}

				{game.state === 'postponed' || game.state === 'canceled' ? (
					<span className={STATUS_CLASS}>{OFF_LABEL[game.state]}</span>
				) : null}
			</Stack>
		</Card>
	)
}
