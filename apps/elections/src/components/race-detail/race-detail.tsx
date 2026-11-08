'use client'

import { lazy, Suspense } from 'react'
import { DateTime } from 'ui/date-time'
import { DescriptionDetails, DescriptionList, DescriptionTerm } from 'ui/description-list'
import { Placeholder } from 'ui/placeholder'
import { useIntl } from 'ui/primitives/intl'
import { Segment, SegmentControl, SegmentItem } from 'ui/segment'
import { Stack } from 'ui/structure/stack'
import type { Race } from '../../types'
import { isCalled, percentText } from '../../utilities/race-math'
import { entryName, type RaceEntry } from '../../utilities/results'
import { RaceSummary } from '../race-summary'

/** The view of a race: its overview, or its counties on a map. */
export type RaceView = 'overview' | 'counties'

/** Props for {@link RaceDetail}. */
export type RaceDetailProps = {
	/** The race of the national results, which the Drawer has before the race loads. */
	entry: Pick<RaceEntry, 'candidates' | 'reporting' | 'called' | 'state' | 'district' | 'contest'>
	/** The race with its counties, or `undefined` while it loads. */
	race: Race | undefined
	/** Opens a county of the race, by its FIPS code. */
	onCounty: (fips: string) => void
	/** The view. The Drawer holds it, so the map stays across a visit to a county. */
	view: RaceView
	onViewChange: (view: RaceView) => void
}

/** The map loads when it first shows, because the map module is a large part of the code. */
const CountyMap = lazy(() =>
	import('./county-map').then((module) => ({ default: module.CountyMap })),
)

/** The still shape of the county map while its code loads. */
const MAP_PLACEHOLDER = (
	<div aria-busy="true">
		<Placeholder className="aspect-[4/3] h-auto w-full" />
	</div>
)

/** The time format of the polls and the call: the day and the time, in the zone of the reader. */
const WHEN: Intl.DateTimeFormatOptions = { dateStyle: 'medium', timeStyle: 'short' }

/**
 * A time of a race, or a still line of one text height while the race loads,
 * so the row keeps its height when the time arrives.
 */
function FactTime({ value }: { value: string | undefined }) {
	return value === undefined ? (
		<Placeholder as="span" pulse={false} className="inline-block h-[1lh] w-40 align-top" />
	) : (
		<DateTime value={value} format={WHEN} />
	)
}

/**
 * The facts of a race under its candidates: the votes, the percent reporting,
 * the polls, and the call. The votes and the percent reporting come from the
 * national results at once. The times come with the race; until then each
 * holds its row with a still line. A time that the race does not give drops
 * its row.
 */
function RaceFacts({ entry, race }: { entry: RaceDetailProps['entry']; race: Race | undefined }) {
	const intl = useIntl()

	const candidates = race?.candidates ?? entry.candidates

	const votes = candidates.reduce((sum, candidate) => sum + candidate.votes, 0)

	const called = race === undefined ? entry.called : race.calledAt !== null

	return (
		<DescriptionList>
			<DescriptionTerm>Total votes</DescriptionTerm>
			<DescriptionDetails className="tabular-nums">{intl.formatNumber(votes)}</DescriptionDetails>

			<DescriptionTerm>Reporting</DescriptionTerm>
			<DescriptionDetails className="tabular-nums">
				{percentText(intl.formatNumber, race?.reporting ?? entry.reporting, 1)}
			</DescriptionDetails>

			{race?.pollsClose === null ? null : (
				<>
					<DescriptionTerm>Polls closed</DescriptionTerm>
					<DescriptionDetails>
						<FactTime value={race?.pollsClose ?? undefined} />
					</DescriptionDetails>
				</>
			)}

			{called ? (
				<>
					<DescriptionTerm>Called</DescriptionTerm>
					<DescriptionDetails>
						<FactTime value={race?.calledAt ?? undefined} />
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
 */
export function RaceDetail({ entry, race, onCounty, view, onViewChange }: RaceDetailProps) {
	const candidates = race?.candidates ?? entry.candidates

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
						called={race === undefined ? entry.called : isCalled(race.candidates)}
						rows="all"
						detail
					/>

					<RaceFacts entry={entry} race={race} />
				</>
			) : (
				<Suspense fallback={MAP_PLACEHOLDER}>
					<CountyMap
						label={`${entryName(entry)} ${entry.contest.label}`}
						state={entry.state.key}
						counties={race?.counties}
						onCounty={onCounty}
					/>
				</Suspense>
			)}
		</Stack>
	)
}
