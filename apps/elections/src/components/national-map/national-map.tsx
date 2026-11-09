'use client'

import { MapPlat } from 'ui/map'
import { Stack } from 'ui/structure/stack'
import statesAtlas from 'us-atlas/states-albers-10m.json'
import type { Contest, Election } from '../../elections/registry'
import { stateOfFips } from '../../elections/us-states'
import { useDrawerStep } from '../../hooks/use-drawer-step'
import { type RaceEntry, WINNER_CATEGORIES } from '../../utilities/results'
import type { OfficeItem } from '../../utilities/trail'
import { ClosestRaces } from '../closest-races'
import { PageTitle } from '../page-title'
import type { StateRow } from './state-rows'

/** Props for {@link NationalMap}. */
export type NationalMapProps = {
	election: Election
	contest: Contest
	/** Each state with a race of the office, and its Winner category, from `stateRows`. */
	rows: StateRow[]
	/** The closest races of the office that are not called, which show under the map. */
	closest: readonly RaceEntry[]
	/** The heading of the page. */
	heading: string
	/** The items of the office switch. */
	items: readonly OfficeItem[]
}

/**
 * The national map of an office under the title of its page, colored by the
 * winner of each state. A click on a state with a race opens the Drawer on the
 * office in the state. A state with no race of the office is disabled: it takes
 * no click, no pointer cursor, and no hover. Under
 * the map, the closest races open the Drawer on their race.
 */
export function NationalMap({
	election,
	contest,
	rows,
	closest,
	heading,
	items,
}: NationalMapProps) {
	const { step, go } = useDrawerStep(election)

	// The map colors the states with a category. A state with a race and no
	// category yet stays neutral, and a click still opens it.
	const data = rows.filter((row): row is { fips: string; winner: string } => row.winner !== null)

	const present = new Set(data.map((row) => row.winner))

	// A state with no race of the office has no row, so the map disables it.
	const raced = new Set(rows.map((row) => row.fips))

	return (
		<Stack gap="xl">
			<PageTitle heading={heading} items={items} value={contest.slug} />

			<MapPlat
				aria-label={`${election.year} ${contest.label} results by state`}
				geography={statesAtlas}
				geographyObject="states"
				projection="identity"
				regionKey="fips"
				selectedRegion={step?.region.fips ?? null}
				onRegionClick={(fips: string) => {
					const state = stateOfFips(fips)

					if (state !== undefined) {
						go({ region: state, office: contest.slug, district: null, county: null })
					}
				}}
				isRegionDisabled={(fips: string) => !raced.has(fips)}
				data={data}
				categoryKey="winner"
				colorName="Winner"
				categories={WINNER_CATEGORIES.filter((category) => present.has(category.value))}
				legend="right"
			/>

			<ClosestRaces election={election} entries={closest} />
		</Stack>
	)
}
