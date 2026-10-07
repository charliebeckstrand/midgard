import Image from 'next/image'
import type { ReactNode } from 'react'
import { Badge } from 'ui/badge'
import { Card } from 'ui/card'
import { cn } from 'ui/core'
import { StatusDot } from 'ui/status'
import { Columns } from 'ui/structure/columns'
import { Flex } from 'ui/structure/flex'
import { Stack } from 'ui/structure/stack'
import type { Game, Pick, Team } from '../../types'
import { gradePick, pickPoints, scoredLine } from '../../utilities/grade'
import { isOff } from '../../utilities/locks'
import { KickoffTime } from '../kickoff-time'
import { PickLine } from '../pick-line'
import { PickMark } from '../pick-mark'

const MUTED = 'text-zinc-500 dark:text-zinc-400'

/**
 * One side of a game: the logo, the name, and the score. In a final game the
 * score of the winner is bold and the score of the loser is muted.
 */
function TeamRow({ team, final, mark }: { team: Team; final: boolean; mark: ReactNode }) {
	const lost = final && !team.winner

	return (
		<Flex align="center" gap="md">
			{team.logo === null ? (
				<span aria-hidden="true" className="size-8 shrink-0" />
			) : (
				<Image
					src={team.logo}
					alt=""
					width={32}
					height={32}
					unoptimized
					className="size-8 shrink-0"
				/>
			)}

			<Flex align="center" gap="sm" className="min-w-0 flex-1">
				<span className={cn('truncate', lost && MUTED)}>{team.name}</span>

				{mark}
			</Flex>

			<span className={cn('tabular-nums', team.winner && 'font-bold', lost && MUTED)}>
				{team.score ?? ''}
			</span>
		</Flex>
	)
}

/** The solid badge of a game that is off. */
const OFF_BADGES = {
	postponed: { label: 'Postponed', color: 'zinc' },
	canceled: { label: 'Canceled', color: 'red' },
} as const

/**
 * The status of a game: its kickoff, its clock with a live mark, `Final`, or
 * a solid badge that says why it is off: `Postponed`, or `Canceled` in red.
 */
export function GameStatus({ game }: { game: Game }) {
	if (game.state === 'scheduled') {
		return <KickoffTime kickoff={game.kickoff} className="block truncate" />
	}

	if (game.state === 'live') {
		return (
			<Flex align="center" gap="sm" className="min-w-0 text-green-600 dark:text-green-500">
				<StatusDot status="active" pulse label="Live" />
				<span className="truncate font-medium">{game.detail ?? 'Live'}</span>
			</Flex>
		)
	}

	if (isOff(game)) {
		const badge = OFF_BADGES[game.state]

		return (
			<Badge variant="solid" color={badge.color}>
				{badge.label}
			</Badge>
		)
	}

	return <span className="block truncate">{game.detail ?? 'Final'}</span>
}

/**
 * One game of a week: the away team over the home team, then a footer with the
 * pick and its line and the status of the game. Without a pick, the card has
 * no footer, and the status is at the end beside the teams. A mark beside the
 * picked team shows whether it won, and its tooltip gives the points.
 */
export function GameCard({ game, pick }: { game: Game; pick: Pick | undefined }) {
	const final = game.state === 'final'

	const picked = [game.away, game.home].find((team) => team.id === pick?.team)

	const line = pick === undefined ? null : scoredLine(game, pick)

	const mark = (
		<PickMark grade={gradePick(game, pick)} points={line === null ? null : pickPoints(line)} />
	)

	const teams = (
		<Stack gap="sm" className="min-w-0 flex-1">
			<TeamRow team={game.away} final={final} mark={picked === game.away ? mark : null} />

			<TeamRow team={game.home} final={final} mark={picked === game.home ? mark : null} />
		</Stack>
	)

	const status = (
		<span className={cn('min-w-0 text-end text-sm', MUTED)}>
			<GameStatus game={game} />
		</span>
	)

	if (picked === undefined || pick === undefined) {
		return (
			<Card>
				{/* A wide gap keeps the status apart from the scores beside it. */}
				<Flex align="center" gap="xl">
					{teams}
					{status}
				</Flex>
			</Card>
		)
	}

	return (
		<Card>
			<Stack gap="md">
				{teams}

				<Flex
					justify="between"
					align="center"
					gap="md"
					className="border-t border-zinc-950/5 pt-3 text-sm dark:border-white/10"
				>
					<Flex
						as="span"
						align="center"
						gap="sm"
						className="shrink-0 whitespace-nowrap tabular-nums"
					>
						<PickLine game={game} pick={pick} team={picked.abbreviation} />
					</Flex>

					{status}
				</Flex>
			</Stack>
		</Card>
	)
}

/** The grid of the game cards of a week: one column on a phone, up to three on a wide screen. */
export function GameGrid({ children }: { children: ReactNode }) {
	return <Columns columns={{ initial: 1, sm: 2, lg: 3 }}>{children}</Columns>
}
