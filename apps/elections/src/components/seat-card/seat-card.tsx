'use client'

import { Card } from 'ui/card'
import { SeatChart } from 'ui/chart'
import { Link } from 'ui/link'
import { Odometer } from 'ui/odometer'
import { HeaderActions, HeaderActionsSlot } from 'ui/primitives/header-actions'
import { Flex } from 'ui/structure/flex'
import { Stack } from 'ui/structure/stack'
import type { Contest } from '../../elections/registry'
import type { PartySeats } from '../../types'
import { majorityParty, seatGroups } from '../../utilities/results'

/** Props for {@link SeatCard}. */
export type SeatCardProps = {
	contest: Contest
	/** The seats of each party, most seats first. */
	parties: readonly PartySeats[]
	/** The national map of the office, which the title links to. */
	href: string
}

/** The words in the hole of the chart: the seats to win until a party has them, then the control. */
function HoleText({ contest, parties }: { contest: Contest; parties: readonly PartySeats[] }) {
	const held = parties.reduce((sum, party) => sum + party.seats, 0)

	const open = Math.max(0, contest.seats - held)

	const control = majorityParty(contest, parties)

	// The hole is small, so its words stay short and break onto two lines.
	const headline =
		control !== null
			? [control.name, 'win control']
			: contest.majority !== undefined
				? [String(contest.majority), 'to win']
				: open > 0
					? [String(open), 'not called']
					: ['All seats', 'called']

	return (
		<div className="flex flex-col items-center pb-0.5 text-center text-xs/4">
			<span className="font-semibold">{headline[0]}</span>

			<span className="font-semibold">{headline[1]}</span>

			{open > 0 && control === null && contest.majority !== undefined ? (
				<span className="text-zinc-500 dark:text-zinc-400">{open} not called</span>
			) : null}
		</div>
	)
}

/** One large seat count under the chart, which rolls to a new count when a seat is called. */
function SeatCount({ party }: { party: PartySeats | undefined }) {
	if (party === undefined) return <span />

	return (
		<div className="flex flex-col">
			<Odometer value={party.seats} className="text-3xl/9 font-semibold tabular-nums" />

			<span className="text-sm text-zinc-600 dark:text-zinc-400">{party.name}</span>
		</div>
	)
}

/**
 * The balance of power of one office: a hemicycle of its seats, a dashed line
 * at the majority, and the seats of the two largest sides as large counts. The
 * menu of the chart sits at the end of the title row.
 */
export function SeatCard({ contest, parties, href }: SeatCardProps) {
	const blue = parties.find((party) => party.slot === 'blue')

	const red = parties.find((party) => party.slot === 'red')

	return (
		<HeaderActions>
			<Card>
				<Stack gap="lg">
					<Flex justify="between" gap="sm" className="min-h-9">
						<Link href={href} className="text-base/6 font-semibold hover:underline">
							{contest.plural}
						</Link>

						<HeaderActionsSlot />
					</Flex>

					<SeatChart
						aria-label={`${contest.label} seats`}
						groups={seatGroups(contest, parties).map((group) => ({
							seats: group.seats,
							color: group.slot,
							label: group.label,
							hollow: group.hollow,
						}))}
						majority={contest.majority}
						contextMenu={{ button: true }}
						height={220}
					>
						<HoleText contest={contest} parties={parties} />
					</SeatChart>

					<Flex align="end" justify="between" gap="lg">
						<SeatCount party={blue} />

						<div className="text-end">
							<SeatCount party={red} />
						</div>
					</Flex>
				</Stack>
			</Card>
		</HeaderActions>
	)
}
