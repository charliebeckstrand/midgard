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
import { seatGroups } from '../../utilities/results'

/** Props for {@link SeatCard}. */
export type SeatCardProps = {
	contest: Contest
	/** The seats of each party, most seats first. */
	parties: readonly PartySeats[]
	/** The national map of the office, which the title links to. */
	href: string
}

/** The words in the hole of the chart: the seats that a party needs to win the chamber. */
function HoleText({ majority }: { majority: number }) {
	// The hole is small, so its words stay short and break onto two lines.
	return (
		<div className="flex flex-col items-center pb-0.5 text-center text-xs/4 font-semibold">
			<span>{majority}</span>

			<span>to win</span>
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
 * The balance of power of one office: a hemicycle of its seats, and the seats
 * of the two largest sides as large counts. An office with a majority gets a
 * dashed line at it and the seats to win in the hole. The menu of the chart
 * sits at the end of the title row.
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
						{contest.majority === undefined ? null : <HoleText majority={contest.majority} />}
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
