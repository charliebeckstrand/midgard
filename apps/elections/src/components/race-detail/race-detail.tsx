'use client'

import { Activity, type ComponentType, lazy, Suspense } from 'react'
import { DateTime } from 'ui/date-time'
import { DescriptionDetails, DescriptionList, DescriptionTerm } from 'ui/description-list'
import type { MapFeatureCollection } from 'ui/map'
import { Odometer } from 'ui/odometer'
import { Placeholder } from 'ui/placeholder'
import { Segment, SegmentControl, SegmentItem } from 'ui/segment'
import { Stack } from 'ui/structure/stack'
import type { Candidate, Race } from '../../types'
import type { RaceView } from '../../utilities/elections-url'
import { isCalled } from '../../utilities/race-math'
import { entryName, type RaceEntry } from '../../utilities/results'
import { RaceSummary } from '../race-summary'
import type { CountyMapProps } from './county-map'
import { loadCountyMap } from './load-county-map'

/**
 * The county map of a race whose address opens on the map, which the page
 * passes from the server, so that the first paint and hydration draw the map.
 */
export type CountyMapSeed = {
	/** The county shapes of the state of the race. */
	shapes: MapFeatureCollection
	/**
	 * The county map, as a client reference from the page. The browser loads its
	 * chunk before it hydrates the Drawer.
	 */
	CountyMap: ComponentType<CountyMapProps>
}

/** Props for {@link RaceDetail}. */
export type RaceDetailProps = {
	/** The race of the national results, which the Drawer has before the race loads. */
	entry: Pick<RaceEntry, 'candidates' | 'reporting' | 'called' | 'state' | 'district' | 'contest'>
	/** The race with its counties, or `undefined` while it loads. */
	race: Race | undefined
	/** Opens a county of the race, by its FIPS code. */
	onCounty: (fips: string) => void
	/** The view. The address holds it, so a reload opens the same view. */
	view: RaceView
	onViewChange: (view: RaceView) => void
	/**
	 * The county shapes of the state, which the page read on the server where the
	 * address opens the race on its map, so the first paint draws the map. `null`
	 * reads them in the browser.
	 */
	shapes: MapFeatureCollection | null
	/**
	 * The county map from the page (`CountyMapSeed`), or `null` to load the map
	 * from its chunk. With it, the map renders with no Suspense boundary.
	 *
	 * After hydration, the Drawer moves into its portal and mounts again. The
	 * lazy map then waits for its chunk again and shows the placeholder, so a
	 * reload on the map takes the map from the page. A boundary also lets the
	 * server send a large map after its fallback, and the fallback then paints
	 * first, so a map with its code takes no boundary.
	 *
	 * The value must stay the same for the life of the Drawer: a change swaps the
	 * element type and mounts a new map, which drops its zoom.
	 */
	CountyMap: ComponentType<CountyMapProps> | null
}

/** The county map, from its chunk. */
const LazyCountyMap = lazy(() => loadCountyMap().then((module) => ({ default: module.CountyMap })))

/** The still shape of the county map while its code loads. */
const MAP_PLACEHOLDER = (
	<div aria-busy="true">
		<Placeholder className="aspect-[4/3] h-auto w-full" />
	</div>
)

/**
 * The time format of the polls and the call: the day and the time in the zone
 * of the state, with the name of the zone, such as `Nov 3, 2026, 7:00 PM CST`.
 */
const WHEN: Intl.DateTimeFormatOptions = {
	month: 'short',
	day: 'numeric',
	year: 'numeric',
	hour: 'numeric',
	minute: '2-digit',
	timeZoneName: 'short',
}

/**
 * A time of a race: a still line of one text height while the race loads, so
 * the row keeps its height when the time arrives, then the time. A time that
 * the race does not give reads `Unknown`, so the row stays.
 *
 * The time is in the set `zone`, so the server writes it. A reload therefore
 * paints the time, not a skeleton.
 */
function FactTime({ value, zone }: { value: string | null | undefined; zone: string }) {
	if (value === undefined) {
		return <Placeholder as="span" pulse={false} className="inline-block h-[1lh] w-40 align-top" />
	}

	return value === null ? (
		<span className="text-zinc-500 dark:text-zinc-400">Unknown</span>
	) : (
		<DateTime value={value} format={{ ...WHEN, timeZone: zone }} />
	)
}

/**
 * The facts of a race under its candidates: the votes, the polls, and the
 * call. The percent reporting is in the row over the facts, so the facts do
 * not repeat it. The votes come from the national results at once. The times
 * come with the race; until then each holds its row with a still line.
 *
 * The rows come from what the Drawer has before the race loads: the polls
 * always, and the call when a candidate won. The race only fills in the times,
 * so the facts keep their height when the race loads.
 */
function RaceFacts({
	candidates,
	called,
	race,
	zone,
}: {
	candidates: readonly Candidate[]
	called: boolean
	race: Race | undefined
	/** The time zone of the state of the race. */
	zone: string
}) {
	const votes = candidates.reduce((sum, candidate) => sum + candidate.votes, 0)

	return (
		<DescriptionList>
			<DescriptionTerm>Total votes</DescriptionTerm>
			<DescriptionDetails>
				<Odometer value={votes} />
			</DescriptionDetails>

			<DescriptionTerm>Polls closed</DescriptionTerm>
			<DescriptionDetails>
				<FactTime value={race?.pollsClose} zone={zone} />
			</DescriptionDetails>

			{called ? (
				<>
					<DescriptionTerm>Called</DescriptionTerm>
					<DescriptionDetails>
						<FactTime value={race?.calledAt} zone={zone} />
					</DescriptionDetails>
				</>
			) : null}
		</DescriptionList>
	)
}

/**
 * One race in full, the body of the Drawer on a statewide race or a district.
 * A Segment at the top switches between two views:
 *
 * - Overview: the candidates with their party and votes, then the facts of the
 *   race.
 * - By county: the counties of the race on a map, and a county opens the county.
 *
 * The candidates and the facts show from the national results at once. The
 * times of the facts and the colors of the map show when the race loads.
 *
 * The map renders in the background while the overview shows, in a hidden
 * `Activity`. A switch to By county therefore shows a map that is already
 * drawn.
 */
export function RaceDetail({
	entry,
	race,
	onCounty,
	view,
	onViewChange,
	shapes,
	CountyMap,
}: RaceDetailProps) {
	const candidates = race?.candidates ?? entry.candidates

	const called = race === undefined ? entry.called : isCalled(race.candidates)

	const countyMap = {
		label: `${entryName(entry)} ${entry.contest.label}`,
		state: entry.state.key,
		statewide: entry.district === null,
		counties: race?.counties,
		onCounty,
		shapes,
	}

	return (
		<Stack gap="xl">
			<Segment value={view} onValueChange={(next) => onViewChange(next as RaceView)}>
				<SegmentControl aria-label="View">
					<SegmentItem value="overview">Overview</SegmentItem>
					<SegmentItem value="counties">By county</SegmentItem>
				</SegmentControl>
			</Segment>

			{view === 'overview' ? (
				<>
					<RaceSummary
						candidates={candidates}
						reporting={race?.reporting ?? entry.reporting}
						called={called}
						rows="all"
						detail
					/>

					<RaceFacts candidates={candidates} called={called} race={race} zone={entry.state.zone} />
				</>
			) : null}

			<Activity mode={view === 'counties' ? 'visible' : 'hidden'}>
				{CountyMap === null ? (
					<Suspense fallback={MAP_PLACEHOLDER}>
						<LazyCountyMap {...countyMap} />
					</Suspense>
				) : (
					<CountyMap {...countyMap} />
				)}
			</Activity>
		</Stack>
	)
}
