'use client'

import { ProgressBar } from 'ui/progress'
import { Flex } from 'ui/structure/flex'
import { Stack } from 'ui/structure/stack'
import { Swatch } from 'ui/swatch'
import { barColor, type Delegation } from '../../utilities/race-math'

/**
 * The seats of a state in the Drawer: in the House card of the overview of a
 * state, and over the districts on the House step. It lists the seats that
 * each party won, each with a bar of its share of the seats, then the count
 * of the seats called. With no seat called, only the count shows.
 */
export function DelegationSummary({ delegation }: { delegation: Delegation }) {
	const { parties, called, total } = delegation

	return (
		<Stack gap="lg">
			{parties.length === 0 ? null : (
				<Stack gap="md" role="list">
					{parties.map((party) => (
						<Stack key={party.party} gap="sm" role="listitem">
							<Flex gap="md">
								<Swatch color={party.slot} />

								<span className="min-w-0 flex-1 truncate font-medium">{party.party}</span>

								<span className="font-semibold tabular-nums">
									{party.seats} {party.seats === 1 ? 'seat' : 'seats'}
								</span>
							</Flex>

							<ProgressBar
								aria-label={`${party.party}, ${party.seats} of ${total} seats`}
								value={party.seats}
								max={total}
								color={barColor(party.slot)}
								size="sm"
							/>
						</Stack>
					))}
				</Stack>
			)}

			<p className="text-sm/6 text-zinc-600 tabular-nums dark:text-zinc-400">
				Seats called {called} of {total}
			</p>
		</Stack>
	)
}
