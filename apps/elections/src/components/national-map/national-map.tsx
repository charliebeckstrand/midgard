'use client'

import { useMemo } from 'react'
import { Button } from 'ui/button'
import { Heading } from 'ui/heading'
import { MapPlat } from 'ui/map'
import { Stack } from 'ui/structure/stack'
import type { Contest, Election } from '../../elections/registry'
import { stateOfFips, stateOfKey, type UsState } from '../../elections/us-states'
import { useDrawerParam } from '../../hooks/use-drawer-param'
import { STATES } from '../../utilities/atlas'
import { REGION_PARAM, racePath } from '../../utilities/elections-url'
import type { Delegation } from '../../utilities/race-math'
import {
	closestRaces,
	delegations,
	delegationWinner,
	entryKey,
	type RaceEntry,
	raceWinner,
	WINNER_CATEGORIES,
} from '../../utilities/results'
import type { OfficeItem } from '../../utilities/trail'
import { PageTitle } from '../page-title'
import { RaceCard, RaceCardGrid } from '../race-card'
import { DelegationSummary, RaceSummary } from '../race-summary'
import { type DrawerView, ResultDrawer } from '../result-drawer'

/** One state of the map: its Winner category. */
type StateRow = { fips: string; winner: string }

/** Props for {@link NationalMap}. */
export type NationalMapProps = {
	election: Election
	contest: Contest
	/** The races of the office: one per state, or one per district for the House. */
	entries: readonly RaceEntry[]
	/** The heading of the page. */
	heading: string
	/** The items of the office switch. */
	items: readonly OfficeItem[]
}

/** The rows of the map: the Winner category of each state that has a race of the office. */
function stateRows(
	entries: readonly RaceEntry[],
	byState: ReadonlyMap<string, Delegation> | null,
): StateRow[] {
	const rows =
		byState === null
			? entries.map((entry) => ({ fips: entry.state.fips, winner: raceWinner(entry) }))
			: [...byState].map(([key, delegation]) => ({
					fips: stateOfKey(key)?.fips,
					winner: delegationWinner(delegation),
				}))

	return rows.flatMap(({ fips, winner }) =>
		fips === undefined || winner === null ? [] : [{ fips, winner }],
	)
}

/**
 * The national map of an office under the title of its page, colored by the
 * winner of each state. A click on a state with a race opens the Drawer on it
 * (`?region=ga`), with the race of the state, or its delegation on the House,
 * and a link to the tab of the office on the state page. A state with no race
 * of the office does nothing. Under the map, the closest races open the same
 * Drawer.
 */
export function NationalMap({ election, contest, entries, heading, items }: NationalMapProps) {
	const districts = contest.depth === 'district'

	const byState = useMemo(() => (districts ? delegations(entries) : null), [districts, entries])

	const rows = useMemo(() => stateRows(entries, byState), [entries, byState])

	const drawer = useDrawerParam(REGION_PARAM)

	const picked = drawer.value === null ? undefined : stateOfKey(drawer.value)

	const view = picked === undefined ? null : drawerView(picked)

	function drawerView(state: UsState): DrawerView | null {
		const open = (
			<Button href={racePath(election, { region: state, contest })} className="self-start">
				Open {state.name}
			</Button>
		)

		const delegation = byState?.get(state.key)

		if (byState !== null) {
			if (delegation === undefined) return null

			return {
				steps: [{ label: state.name }],
				subtitle: `${contest.label}, ${delegation.total} ${delegation.total === 1 ? 'seat' : 'seats'}`,
				body: (
					<Stack gap="lg">
						<DelegationSummary delegation={delegation} />
						{open}
					</Stack>
				),
			}
		}

		const entry = entries.find((candidate) => candidate.state.key === state.key)

		if (entry === undefined) return null

		return {
			steps: [{ label: state.name }],
			subtitle: contest.label,
			body: (
				<Stack gap="lg">
					<RaceSummary
						candidates={entry.candidates}
						reporting={entry.reporting}
						called={entry.called}
					/>
					{open}
				</Stack>
			),
		}
	}

	const present = new Set(rows.map((row) => row.winner))

	// A state with no race of the office has no row, so a click on it does nothing.
	const raced = new Set(rows.map((row) => row.fips))

	return (
		<Stack gap="xl">
			<PageTitle heading={heading} items={items} value={contest.slug} />

			<MapPlat
				aria-label={`${election.year} ${contest.label} results by state`}
				geography={STATES}
				projection="albers-usa"
				regionKey="fips"
				selectedRegion={picked?.fips ?? null}
				onRegionClick={(fips: string) => {
					const state = stateOfFips(fips)

					if (state !== undefined && raced.has(fips)) drawer.open(state.key)
				}}
				data={rows}
				categoryKey="winner"
				colorName="Winner"
				categories={WINNER_CATEGORIES.filter((category) => present.has(category.value))}
				legend="right"
			/>

			<section>
				<Stack gap="lg">
					<Heading level={2}>Closest races</Heading>

					<RaceCardGrid>
						{closestRaces(entries, 6).map((entry) => (
							<RaceCard
								key={entryKey(entry)}
								entry={entry}
								onPick={() => drawer.open(entry.state.key)}
							/>
						))}
					</RaceCardGrid>
				</Stack>
			</section>

			<ResultDrawer view={view} onClose={drawer.close} />
		</Stack>
	)
}
