'use client'

import { ArrowRight } from 'lucide-react'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import type { Seed } from 'shared/queries'
import { Badge } from 'ui/badge'
import { Button } from 'ui/button'
import { Icon } from 'ui/icon'
import { SearchInput } from 'ui/search-input'
import { Segment, SegmentControl, SegmentItem } from 'ui/segment'
import { Stack } from 'ui/structure/stack'
import type { Election } from '../../elections/registry'
import { setDrawerArrived, useAddressStep } from '../../hooks/use-drawer'
import { useRace } from '../../queries/race-queries'
import type { CountyResult, Race } from '../../types'
import { type DrawerStep, districtName, drawerHref, statePath } from '../../utilities/elections-url'
import { delegation } from '../../utilities/race-math'
import {
	entryKey,
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
import { useElectionRaces } from './context'

/** Props for {@link ElectionDrawer}. */
export type ElectionDrawerProps = {
	election: Election
	/** The race of the step of the address, which the page read on the server, or `null`. */
	seed: Seed<Race> | null
}

/** Moves the Drawer to a step, or closes it with `null`. */
type Go = (step: DrawerStep | null) => void

/** The view of the race of the step, which the Drawer holds across a visit to a county. */
type Views = { view: RaceView; onViewChange: (view: RaceView) => void }

/** The layout of a county: each candidate in full, or one short line each. */
type CountyLayout = 'detailed' | 'condensed'

/** The layout of a county, which the Drawer holds across counties and races. */
type Layouts = { layout: CountyLayout; onLayoutChange: (layout: CountyLayout) => void }

/** The search of the districts of an office, which the Drawer holds across a visit to a district. */
type Search = { query: string; onQueryChange: (query: string) => void }

/** The number of districts that an office must pass to get a search. */
const SEARCH_ABOVE = 3

/**
 * The trail of a step: the state, which is its overview and leads back to it;
 * then, on an office, the office with the menu of the offices of the state, and
 * the district where there is one. The caller adds the county. Each crumb that
 * leads back has the address of its step on the page at `path`.
 */
function drawerTrail(
	election: Election,
	races: readonly OfficeRaces[],
	step: DrawerStep,
	go: Go,
	path: string,
): TrailCrumb[] {
	const { region, office } = step

	// The overview of the state is the state alone.
	if (office === null) return [{ label: region.name }]

	const back = (target: DrawerStep) => ({
		href: drawerHref(path, target),
		onPick: () => go(target),
	})

	const offices = new Set(
		races.filter((entry) => entry.entries.length > 0).map((entry) => entry.contest.slug),
	)

	const items = contestItems(election, offices)

	const trail: TrailCrumb[] = [
		{
			label: region.name,
			...back({ region, office: null, district: null, county: null }),
		},
		{
			label: items.find((item) => item.value === office)?.label ?? office,
			...back({ region, office, district: null, county: null }),
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
			...back({ ...step, county: null }),
		})
	}

	return trail
}

/**
 * The overview of a state: a card of each office with a race in the state,
 * which leads to the office. Under the cards, a link leads to the page of the
 * state, except on a page of that state.
 */
function StateOverview({
	election,
	races,
	step,
	go,
}: {
	election: Election
	races: readonly OfficeRaces[]
	step: DrawerStep
	go: Go
}) {
	const pathname = usePathname()

	const page = statePath(election, step.region, null)

	const onPage = pathname === page || pathname.startsWith(`${page}/`)

	return (
		<Stack gap="lg">
			{races.map(({ contest, entries }) => (
				<OfficeCard
					key={contest.slug}
					contest={contest}
					entries={entries}
					onPick={() =>
						go({ region: step.region, office: contest.slug, district: null, county: null })
					}
				/>
			))}

			{onPage ? null : (
				<Button href={page} variant="plain" suffix={<Icon icon={<ArrowRight />} />}>
					View {step.region.name}
				</Button>
			)}
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

			{/* The status stays in the page while the search shows, so a screen reader
			    reads its text when a query matches nothing (WCAG 4.1.3). */}
			{searchable ? (
				<p
					role="status"
					className={
						districts.length === 0 ? 'text-sm text-zinc-500 dark:text-zinc-400' : 'sr-only'
					}
				>
					{districts.length === 0 ? 'No district matches.' : null}
				</p>
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
 * One county of a race. A Segment at the top switches between two layouts:
 *
 * - Detailed: each candidate with an avatar, the party, and the votes, as the
 *   overview of the race shows them.
 * - Condensed: each candidate with a swatch, the name, and the share.
 */
function CountyView({
	county,
	called,
	layouts,
}: {
	county: CountyResult
	called: boolean
	layouts: Layouts
}) {
	return (
		<Stack gap="xl">
			<Segment
				value={layouts.layout}
				onValueChange={(next) => layouts.onLayoutChange(next as CountyLayout)}
			>
				<SegmentControl aria-label="Layout">
					<SegmentItem value="detailed">Detailed</SegmentItem>
					<SegmentItem value="condensed">Condensed</SegmentItem>
				</SegmentControl>
			</Segment>

			<RaceSummary
				candidates={county.candidates}
				reporting={county.reporting}
				called={called}
				rows="all"
				detail={layouts.layout === 'detailed'}
			/>
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
	layouts: Layouts,
): DrawerView {
	// Only the race tells a special election, so the badge comes when the race
	// loads. It sits in the row of the trail, so the panel keeps its height.
	const badge = race?.special ? (
		<Badge variant="soft" color="zinc">
			Special
		</Badge>
	) : undefined

	const county =
		step.county === null
			? undefined
			: race?.counties.find((candidate) => candidate.fips === step.county)

	if (county !== undefined) {
		return {
			steps: [...trail, { label: county.name }],
			badge,
			body: <CountyView county={county} called={entry.called} layouts={layouts} />,
		}
	}

	return {
		steps: trail,
		badge,
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
	layouts: Layouts,
	search: Search,
	path: string,
): DrawerView | null {
	const races = stateRaces(results, step.region)

	const trail = drawerTrail(election, races, step, go, path)

	const office = races.find((candidate) => candidate.contest.slug === step.office)

	if (office === undefined) {
		return {
			steps: trail,
			body: <StateOverview election={election} races={races} step={step} go={go} />,
		}
	}

	if (entry !== undefined) return raceView(entry, race, trail, step, go, views, layouts)

	if (office.contest.depth !== 'district' || step.district !== null) return null

	return {
		steps: trail,
		body: <StateDelegation office={office} step={step} go={go} search={search} />,
	}
}

/**
 * The Drawer of an election, on each page of it. A state opens it; the address
 * holds its step (see {@link useAddressStep}). It reads the races from the
 * `ElectionRacesProvider` of the layout of the election.
 *
 * Its trail is the state, the office, then the district and the county where
 * the reader went that deep, such as `Georgia › House › 6th District › Fulton`.
 * The state alone is its overview, and the state crumb leads back to it. The
 * office crumb opens the offices of the state, and an office with no race in
 * the state is disabled.
 *
 * - The overview: a card of each office of the state, which leads to the
 *   office, and a link to the page of the state.
 * - A statewide office or a district: the race, with a Segment between its
 *   overview and its counties on a map.
 * - The House: the delegation of the state, then a card of each district.
 * - A county: the race in that county, with a Segment between a detailed and a
 *   condensed layout of the candidates.
 */
export function ElectionDrawer({ election, seed }: ElectionDrawerProps) {
	const results = useElectionRaces()

	const { step, go } = useAddressStep(election)

	const pathname = usePathname()

	usePreloadCountyMap(step?.region.key ?? null)

	const entry = step === null ? undefined : stepEntry(results, step)

	const read = useRace(entry?.raceId ?? null, seed)

	const race = read.data?.id === entry?.raceId ? read.data : undefined

	// Each race opens on its overview. The map stays across a visit to one of its
	// counties, and resets once the Drawer leaves the race.
	const [mapRace, setMapRace] = useState<number | null>(null)

	if (mapRace !== null && mapRace !== entry?.raceId) setMapRace(null)

	const views: Views = {
		view: entry !== undefined && mapRace === entry.raceId ? 'counties' : 'overview',
		onViewChange: (next) =>
			setMapRace(next === 'counties' && entry !== undefined ? entry.raceId : null),
	}

	// The layout of a county is a choice of the reader, so it stays across
	// counties and races.
	const [layout, setLayout] = useState<CountyLayout>('detailed')

	const layouts: Layouts = { layout, onLayoutChange: setLayout }

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
		step === null
			? null
			: drawerView(election, results, step, entry, race, go, views, layouts, search, pathname)

	const open = view !== null

	// The page reads the step once the panel is up (`useDrawerStep`). A closed
	// panel is not up, so the next open waits for its arrival. A close by Back
	// does not pass `go`, so the commit of the close clears it.
	useEffect(() => {
		if (!open) setDrawerArrived(false)
	}, [open])

	return (
		<ResultDrawer
			view={view}
			onClose={() => go(null)}
			onOpenComplete={() => setDrawerArrived(true)}
		/>
	)
}
