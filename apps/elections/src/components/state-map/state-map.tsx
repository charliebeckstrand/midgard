'use client'

import type { Contest, Election } from '../../elections/registry'
import type { UsState } from '../../elections/us-states'
import { useDrawerGo } from '../../hooks/use-drawer'
import type { CountyResult } from '../../types'
import type { RaceEntry } from '../../utilities/results'
import { CountyMap } from '../race-detail/county-map'

/** Props for {@link StateMap}. */
export type StateMapProps = {
	election: Election
	contest: Contest
	state: UsState
	/** The races of the office in the state. */
	entries: readonly RaceEntry[]
	/** The counties of the map, from `stateOffices`. */
	counties: readonly CountyResult[]
	/** The ratio of the width to the height of the state, from `countyAspect`. */
	aspect: number
}

/** The tallest that the map draws, in px, so a tall state does not fill the screen. */
const MAX_HEIGHT = 560

/**
 * The county map of an office on the page of a state. With one race, such as
 * the Senate or an at-large seat of the House, the map is the race, and a
 * click on a county opens the county of the race in the Drawer. With many
 * races, such as the districts of the House, the map shows the party that
 * leads the vote of the office in each county, and a county opens nothing,
 * because the county can be in more than one district.
 *
 * The page renders the map on the server, with its legend, and the shapes
 * fill it once they load. The frame takes the ratio of the state, so it has
 * its final size in the first paint, and it is never taller than
 * {@link MAX_HEIGHT}.
 */
export function StateMap({ election, contest, state, entries, counties, aspect }: StateMapProps) {
	const go = useDrawerGo(election)

	const [only, ...others] = entries

	const single = only !== undefined && others.length === 0 ? only : null

	return (
		<div className="mx-auto w-full" style={{ maxWidth: MAX_HEIGHT * aspect }}>
			<CountyMap
				label={`${state.name} ${contest.label}`}
				state={state.key}
				statewide
				counties={counties}
				aspectRatio={aspect}
				onCounty={
					single === null
						? undefined
						: (fips) =>
								go({
									region: state,
									office: contest.slug,
									district: single.district,
									view: 'overview',
									county: fips,
								})
				}
			/>
		</div>
	)
}
