'use client'

import { Heading } from 'ui/heading'
import { Stack } from 'ui/structure/stack'
import { useDrawerGo } from '../../hooks/use-drawer'
import type { Election } from '../../utilities/registry'
import { entryKey, entryStep, type RaceEntry } from '../../utilities/results'
import { RaceCard, RaceCardGrid } from '../race-card'

/**
 * The closest races of a page that are not called, under a heading. The page
 * picks them on the server with `closestRaces`, so it sends only the races
 * that show. A card opens its race in the Drawer. Once each race is called,
 * the section shows nothing. The page of a state also lists its called races
 * under their own heading.
 *
 * @param office - Shows the office under the name of each race, for races of many offices.
 * @param heading - The heading of the section.
 */
export function ClosestRaces({
	election,
	entries,
	office = false,
	heading = 'Closest races',
}: {
	election: Election
	entries: readonly RaceEntry[]
	office?: boolean
	heading?: string
}) {
	const go = useDrawerGo(election)

	if (entries.length === 0) return null

	return (
		<section>
			<Stack gap="lg">
				<Heading level={2}>{heading}</Heading>

				<RaceCardGrid>
					{entries.map((entry) => (
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
