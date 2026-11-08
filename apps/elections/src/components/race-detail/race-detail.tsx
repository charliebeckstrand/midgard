'use client'

import { lazy, Suspense, useState } from 'react'
import { Collapse, CollapsePanel, CollapseTrigger } from 'ui/collapse'
import { DateTime } from 'ui/date-time'
import { DescriptionDetails, DescriptionList, DescriptionTerm } from 'ui/description-list'
import type { GridSortState } from 'ui/grid'
import { Placeholder } from 'ui/placeholder'
import { useIntl } from 'ui/primitives/intl'
import { Flex } from 'ui/structure/flex'
import { Stack } from 'ui/structure/stack'
import type { Race } from '../../types'
import { isCalled, percentText } from '../../utilities/race-math'
import type { RaceEntry } from '../../utilities/results'
import { CollapseCaret } from '../collapse-caret'
import { RaceSummary } from '../race-summary'

/** Props for {@link RaceDetail}. */
export type RaceDetailProps = {
	/** The race of the national results, which the Drawer has before the race loads. */
	entry: Pick<RaceEntry, 'candidates' | 'reporting' | 'called'>
	/** The race with its counties, or `undefined` while it loads. */
	race: Race | undefined
	/** Opens a county of the race, by its FIPS code. */
	onCounty: (fips: string) => void
	/** The county table is open. The Drawer holds it, so it stays open across a visit to a county. */
	countiesOpen: boolean
	onCountiesOpenChange: (open: boolean) => void
}

/** The table loads when it first opens, because the Grid is a large part of the code of the page. */
const CountyGrid = lazy(() =>
	import('./county-grid').then((module) => ({ default: module.CountyGrid })),
)

/** The still shape of the county table while the race or the table loads. */
const TABLE_PLACEHOLDER = (
	<div aria-busy="true">
		<Placeholder className="h-64" />
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
 * One race in full, the body of the Drawer on a statewide race or a district:
 * the candidates with their party and votes, the facts of the race, then the
 * counties in a table. The table is in a Collapse, and a county row opens the
 * county. The candidates, the facts, and the closed table show from the
 * national results at once. The times of the facts and the rows of the table
 * show when the race loads, and still shapes hold their place until then. The
 * table also loads its code on the first open, behind the same still shape.
 */
export function RaceDetail({
	entry,
	race,
	onCounty,
	countiesOpen,
	onCountiesOpenChange,
}: RaceDetailProps) {
	const [query, setQuery] = useState('')

	const [sort, setSort] = useState<GridSortState[]>([{ column: 'votes', direction: 'desc' }])

	const candidates = race?.candidates ?? entry.candidates

	return (
		<Stack gap="xl">
			<RaceSummary
				candidates={candidates}
				reporting={race?.reporting ?? entry.reporting}
				called={race === undefined ? entry.called : isCalled(race.candidates)}
				rows="all"
				detail
			/>

			<RaceFacts entry={entry} race={race} />

			<Collapse open={countiesOpen} onOpenChange={onCountiesOpenChange}>
				<CollapseTrigger>
					<Flex as="span" gap="sm" className="text-base/6 font-semibold">
						By county
						<CollapseCaret />
					</Flex>
				</CollapseTrigger>

				<CollapsePanel>
					<div className="pt-4">
						<Suspense fallback={TABLE_PLACEHOLDER}>
							{race === undefined ? (
								TABLE_PLACEHOLDER
							) : (
								<CountyGrid
									counties={race.counties}
									sort={sort}
									onSortChange={setSort}
									query={query}
									onQueryChange={setQuery}
									onCounty={onCounty}
								/>
							)}
						</Suspense>
					</div>
				</CollapsePanel>
			</Collapse>
		</Stack>
	)
}
