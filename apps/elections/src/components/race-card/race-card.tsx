'use client'

import type { ReactNode } from 'react'
import { Card } from 'ui/card'
import { useIntl } from 'ui/primitives/intl'
import { ProgressBar } from 'ui/progress'
import { Columns } from 'ui/structure/columns'
import { Flex } from 'ui/structure/flex'
import { Stack } from 'ui/structure/stack'
import { Swatch } from 'ui/swatch'
import type { Candidate } from '../../types'
import { barColor, leaders, percentText } from '../../utilities/race-math'
import { entryName, type RaceEntry } from '../../utilities/results'
import { ReportingRow, WinnerMark } from '../race-summary'

/** Props for {@link RaceCard}. */
export type RaceCardProps = {
	entry: RaceEntry
	/** Shows the office under the name, for a list of races of many offices. */
	office?: boolean
	/** Fires when the card is picked. It opens the race in the Drawer. */
	onPick?: () => void
}

/**
 * One leader of a head-to-head, with the share to two decimals. The winner mark
 * follows the name, as in the race summary.
 */
function LeaderRow({ candidate }: { candidate: Candidate }) {
	const intl = useIntl()

	return (
		<Flex gap="sm" className="text-sm/6">
			<Swatch color={candidate.slot} />

			<Flex gap="sm" flex="1" className="min-w-0">
				<span className="truncate">{candidate.name}</span>

				{candidate.winner ? <WinnerMark /> : null}
			</Flex>

			<span className="font-semibold tabular-nums">
				{percentText(intl.formatNumber, candidate.percent, 2)}
			</span>
		</Flex>
	)
}

/**
 * The bar of a head-to-head: the leader from the start and the runner-up from
 * the end, as shares of the two, with a mark at 50%.
 */
function HeadToHead({ leader, runnerUp }: { leader: Candidate; runnerUp: Candidate }) {
	const both = leader.percent + runnerUp.percent

	const share = (candidate: Candidate) => (both === 0 ? 50 : (candidate.percent / both) * 100)

	return (
		<ProgressBar
			aria-label={`${leader.name} against ${runnerUp.name}`}
			segments={[
				{ value: share(leader), color: barColor(leader.slot), label: leader.name },
				{ value: share(runnerUp), color: barColor(runnerUp.slot), label: runnerUp.name },
			]}
			marks={[{ value: 50 }]}
			size="sm"
		/>
	)
}

/** The frame of a card: a button, or a plain card. */
function CardFrame({ onPick, children }: Omit<RaceCardProps, 'entry'> & { children: ReactNode }) {
	const frame =
		'h-full text-start transition-shadow hover:shadow-md focus-visible:outline-2 focus-visible:outline-blue-500'

	const body = (
		<Stack gap="md" className="h-full">
			{children}
		</Stack>
	)

	if (onPick !== undefined) {
		return (
			<button
				type="button"
				onClick={onPick}
				className="block h-full w-full cursor-pointer rounded-xl text-start"
			>
				<Card className={frame}>{body}</Card>
			</button>
		)
	}

	return <Card className={frame}>{body}</Card>
}

/**
 * A card of one close race: the race, with its office under it, the two
 * leaders to two decimals, a head-to-head bar with a mark at 50%, and the
 * percent reporting with the call badge.
 */
export function RaceCard({ entry, office = false, onPick }: RaceCardProps) {
	const { leader, runnerUp } = leaders(entry.candidates)

	return (
		<CardFrame onPick={onPick}>
			<div>
				<div className="font-semibold">{entryName(entry)}</div>

				{office ? (
					<div className="text-sm/5 text-zinc-500 dark:text-zinc-400">{entry.contest.label}</div>
				) : null}
			</div>

			<Stack gap="xs">
				{leader === undefined ? null : <LeaderRow candidate={leader} />}

				{runnerUp === undefined ? null : <LeaderRow candidate={runnerUp} />}
			</Stack>

			{leader !== undefined && runnerUp !== undefined ? (
				<HeadToHead leader={leader} runnerUp={runnerUp} />
			) : null}

			<div className="mt-auto">
				<ReportingRow reporting={entry.reporting} called={entry.called} />
			</div>
		</CardFrame>
	)
}

/** The grid of race cards: one column on a phone, up to three on a wide screen. */
export function RaceCardGrid({ children }: { children: ReactNode }) {
	return <Columns columns={{ initial: 1, sm: 2, lg: 3 }}>{children}</Columns>
}
