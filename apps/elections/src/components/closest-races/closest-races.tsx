'use client'

import { Heading } from 'ui/heading'
import { Stack } from 'ui/structure/stack'
import type { Election } from '../../elections/registry'
import { useDrawerStep } from '../../hooks/use-drawer-step'
import { closestRaces, entryKey, entryStep, type RaceEntry } from '../../utilities/results'
import { RaceCard, RaceCardGrid } from '../race-card'

/**
 * The closest races of a page, under a heading: the six closest of `entries`.
 * A card opens its race in the Drawer.
 *
 * @param office - Shows the office under the name of each race, for races of many offices.
 */
export function ClosestRaces({
	election,
	entries,
	office = false,
}: {
	election: Election
	entries: readonly RaceEntry[]
	office?: boolean
}) {
	const { go } = useDrawerStep(election)

	return (
		<section>
			<Stack gap="lg">
				<Heading level={2}>Closest races</Heading>

				<RaceCardGrid>
					{closestRaces(entries, 6).map((entry) => (
						<RaceCard
							key={entryKey(entry)}
							entry={entry}
							office={office}
							onPick={() => go(entryStep(entry))}
						/>
					))}
				</RaceCardGrid>
			</Stack>
		</section>
	)
}
