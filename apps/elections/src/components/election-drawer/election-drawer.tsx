'use client'

import { useState } from 'react'
import type { Seed } from 'shared/queries'
import { SearchInput } from 'ui/search-input'
import { Stack } from 'ui/structure/stack'
import type { Election } from '../../elections/registry'
import { useDrawerStep } from '../../hooks/use-drawer-step'
import { useRace } from '../../queries/race-queries'
import type { Race } from '../../types'
import { type DrawerStep, districtName } from '../../utilities/elections-url'
import { delegation } from '../../utilities/race-math'
import {
	entryKey,
	isCounting,
	matchesSearch,
	type OfficeRaces,
	type RaceEntry,
	stateRaces,
	stepEntry,
} from '../../utilities/results'
import { contestItems } from '../../utilities/trail'
import { OfficeCard } from '../office-card'
import { RaceCard } from '../race-card'
import { RaceDetail, type RaceView, usePreloadCountyMap } from '../race-detail'
import { DelegationSummary, RaceSummary } from '../race-summary'
import { type DrawerView, ResultDrawer, type TrailCrumb } from '../result-drawer'

/** Props for {@link ElectionDrawer}. */
export type ElectionDrawerProps = {
	election: Election
	/** The races of each office, in the order of the registry. */
	results: readonly OfficeRaces[]
	/** The race of the step of the address, which the page read on the server, or `null`. */
	seed: Seed<Race> | null
}

/** Moves the Drawer to a step, or closes it with `null`. */
type Go = (step: DrawerStep | null) => void

/** The view of the race of the step, which the Drawer holds across a visit to a county. */
type Views = { view: RaceView; onViewChange: (view: RaceView) => void }

/** The search of the districts of an office, which the Drawer holds across a visit to a district. */
type Search = { query: string; onQueryChange: (query: string) => void }

/** The number of districts that an office must pass to get a search. */
const SEARCH_ABOVE = 3

/**
 * The trail of a step: the state, which is its overview and leads back to it;
 * then, on an office, the office with the menu of the offices of the state, and
 * the district where there is one. The caller adds the county.
 */
function drawerTrail(
	election: Election,
	races: readonly OfficeRaces[],
	step: DrawerStep,
	go: Go,
): TrailCrumb[] {
	const { region, office } = step

	// The overview of the state is the state alone.
	if (office === null) return [{ label: region.name }]

	const offices = new Set(
		races.filter((entry) => entry.entries.length > 0).map((entry) => entry.contest.slug),
	)

	const items = contestItems(election, offices)

	const deeper = step.district !== null || step.county !== null

	const trail: TrailCrumb[] = [
		{
			label: region.name,
			onPick: () => go({ region, office: null, district: null, county: null }),
		},
		{
			label: items.find((item) => item.value === office)?.label ?? office,
			onPick: deeper ? () => go({ region, office, district: null, county: null }) : undefined,
			menu: items.map((item) => ({
				label: item.label,
				disabled: item.disabled,
				onPick: () => go({ region, office: item.value, district: null, county: null }),
			})),
		},
	]

	if (step.district !== null) {
		trail.push({
			label: districtName(step.district),
			onPick: step.county === null ? undefined : () => go({ ...step, county: null }),
		})
	}

	return trail
}

/** The overview of a state: a card of each office with a race in the state, which leads to the office. */
function StateOverview({
	races,
	step,
	go,
}: {
	races: readonly OfficeRaces[]
	step: DrawerStep
	go: Go
}) {
	return (
		<Stack gap="lg">
			{races.map(({ contest, entries }) => {
				const [only] = entries

				if (only === undefined) return null

				return (
					<OfficeCard
						key={contest.slug}
						title={contest.label}
						onPick={() =>
							go({ region: step.region, office: contest.slug, district: null, county: null })
						}
					>
						{contest.depth === 'district' ? (
							<DelegationSummary delegation={delegation(entries.map((race) => race.candidates))} />
						) : (
							<RaceSummary
								candidates={only.candidates}
								reporting={only.reporting}
								called={only.called}
							/>
						)}
					</OfficeCard>
				)
			})}
		</Stack>
	)
}

/**
 * The delegation of a state, then a card of each district, which leads to the
 * district. Above {@link SEARCH_ABOVE} districts, a search over the cards finds a
 * district by its name or by the name of a candidate.
 */
function StateDelegation({
	office,
	step,
	go,
	search,
}: {
	office: OfficeRaces
	step: DrawerStep
	go: Go
	search: Search
}) {
	const searchable = office.entries.length > SEARCH_ABOVE

	const query = searchable ? search.query : ''

	const districts = office.entries.filter((district) => matchesSearch(district, query))

	return (
		<Stack gap="lg">
			<DelegationSummary delegation={delegation(office.entries.map((race) => race.candidates))} />

			{searchable ? (
				<SearchInput
					value={search.query}
					onValueChange={search.onQueryChange}
					placeholder="Search districts and candidates"
					aria-label="Search districts and candidates"
				/>
			) : null}

			{searchable && districts.length === 0 ? (
				<p className="text-sm text-zinc-500 dark:text-zinc-400">No district matches.</p>
			) : null}

			{districts.map((district) => (
				<RaceCard
					key={entryKey(district)}
					entry={district}
					onPick={() => go({ ...step, district: district.district, county: null })}
				/>
			))}
		</Stack>
	)
}

/**
 * The view of one race: the race in full, or one county of it. The county shows
 * once the race loads; until then the Drawer holds the race.
 */
function raceView(
	entry: RaceEntry,
	race: Race | undefined,
	trail: TrailCrumb[],
	step: DrawerStep,
	go: Go,
	views: Views,
): DrawerView {
	const subtitle = race?.special ? 'Special election' : undefined

	const county =
		step.county === null
			? undefined
			: race?.counties.find((candidate) => candidate.fips === step.county)

	if (county !== undefined) {
		return {
			steps: [...trail, { label: county.name }],
			subtitle,
			body: (
				<RaceSummary
					candidates={county.candidates}
					reporting={county.reporting}
					called={entry.called}
					rows="all"
				/>
			),
		}
	}

	return {
		steps: trail,
		subtitle,
		body: (
			<RaceDetail
				entry={entry}
				race={race}
				onCounty={(fips) => go({ ...step, county: fips })}
				view={views.view}
				onViewChange={views.onViewChange}
			/>
		),
	}
}

/**
 * The view of a step: the overview of the state, the delegation of the House,
 * or one race. `null` for a step whose race the results do not hold.
 */
function drawerView(
	election: Election,
	results: readonly OfficeRaces[],
	step: DrawerStep,
	entry: RaceEntry | undefined,
	race: Race | undefined,
	go: Go,
	views: Views,
	search: Search,
): DrawerView | null {
	const races = stateRaces(results, step.region)

	const trail = drawerTrail(election, races, step, go)

	const office = races.find((candidate) => candidate.contest.slug === step.office)

	if (office === undefined) {
		return { steps: trail, body: <StateOverview races={races} step={step} go={go} /> }
	}

	if (entry !== undefined) return raceView(entry, race, trail, step, go, views)

	if (office.contest.depth !== 'district' || step.district !== null) return null

	return {
		steps: trail,
		body: <StateDelegation office={office} step={step} go={go} search={search} />,
	}
}

/**
 * The Drawer of an election, on each page of it. A state opens it; the address
 * holds its step (see {@link useDrawerStep}).
 *
 * Its trail is the state, the office, then the district and the county where
 * the reader went that deep, such as `Georgia › House › 6th District › Fulton`.
 * The state alone is its overview, and the state crumb leads back to it. The
 * office crumb opens the offices of the state, and an office with no race in
 * the state is disabled.
 *
 * - The overview: a card of each office of the state, which leads to the office.
 * - A statewide office or a district: the race, with a Segment between its
 *   overview and its counties on a map.
 * - The House: the delegation of the state, then a card of each district.
 * - A county: the race in that county.
 */
export function ElectionDrawer({ election, results, seed }: ElectionDrawerProps) {
	const { step, go } = useDrawerStep(election)

	usePreloadCountyMap(step?.region.key ?? null)

	const entry = step === null ? undefined : stepEntry(results, step)

	const read = useRace(entry?.raceId ?? null, seed, entry !== undefined && isCounting([entry]))

	const race = read.data?.id === entry?.raceId ? read.data : undefined

	// Each race opens on its overview. The map stays across a visit to one of its counties.
	const [mapRace, setMapRace] = useState<number | null>(null)

	const views: Views = {
		view: entry !== undefined && mapRace === entry.raceId ? 'counties' : 'overview',
		onViewChange: (next) =>
			setMapRace(next === 'counties' && entry !== undefined ? entry.raceId : null),
	}

	// The search belongs to an office of a state: it stays across a visit to one
	// of its districts, and empties once the Drawer leaves the office.
	const scope = step === null || step.office === null ? null : `${step.region.key}:${step.office}`

	const [held, setHeld] = useState({ scope, query: '' })

	if (held.scope !== scope) setHeld({ scope, query: '' })

	const search: Search = {
		query: held.scope === scope ? held.query : '',
		onQueryChange: (query) => setHeld({ scope, query }),
	}

	const view =
		step === null ? null : drawerView(election, results, step, entry, race, go, views, search)

	return <ResultDrawer view={view} onClose={() => go(null)} />
}
