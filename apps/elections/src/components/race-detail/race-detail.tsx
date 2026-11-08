'use client'

import { useState } from 'react'
import { Collapse, CollapsePanel, CollapseTrigger } from 'ui/collapse'
import { DateTime } from 'ui/date-time'
import { DescriptionDetails, DescriptionList, DescriptionTerm } from 'ui/description-list'
import { Grid, type GridColumn, type GridSortState } from 'ui/grid'
import { Placeholder } from 'ui/placeholder'
import { useIntl } from 'ui/primitives/intl'
import { Flex } from 'ui/structure/flex'
import { Stack } from 'ui/structure/stack'
import type { CountyResult, Race } from '../../types'
import { isCalled, marginLabel, percentText } from '../../utilities/race-math'
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

/** The total votes of a county. */
function countyVotes(county: CountyResult): number {
	return county.candidates.reduce((sum, candidate) => sum + candidate.votes, 0)
}

function CountyNumber({ value }: { value: number }) {
	const intl = useIntl()

	return <span className="tabular-nums">{intl.formatNumber(value)}</span>
}

function CountyShare({ value }: { value: number }) {
	const intl = useIntl()

	return <span className="tabular-nums">{percentText(intl.formatNumber, value, 0)}</span>
}

const COLUMNS: GridColumn<CountyResult>[] = [
	{ id: 'county', title: 'County', cell: (county) => county.name, value: (county) => county.name },
	{
		id: 'margin',
		title: 'Margin',
		cell: (county) => <span className="tabular-nums">{marginLabel(county.candidates)}</span>,
		// The margin sorts by its number, not by its label.
		value: (county) => {
			const [leader, runnerUp] = county.candidates

			return leader === undefined ? 0 : leader.percent - (runnerUp?.percent ?? 0)
		},
	},
	{
		id: 'votes',
		title: 'Votes',
		cell: (county) => <CountyNumber value={countyVotes(county)} />,
		value: countyVotes,
	},
	{
		id: 'in',
		title: 'In',
		cell: (county) => <CountyShare value={county.reporting} />,
		value: (county) => county.reporting,
	},
]

/**
 * One race in full, the body of the Drawer on a statewide race or a district:
 * the candidates with their party and votes, the facts of the race, then the
 * counties in a table. The table is in a Collapse, and a county row opens the
 * county. The candidates, the facts, and the closed table show from the
 * national results at once. The times of the facts and the rows of the table
 * show when the race loads, and still shapes hold their place until then.
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

			{/*
			 * The Drawer is the one that travels: the panel grows to its content in
			 * one move, so the Collapse snaps rather than animating a second height
			 * that the panel would then chase.
			 */}
			<Collapse open={countiesOpen} onOpenChange={onCountiesOpenChange} animate={false}>
				<CollapseTrigger>
					<Flex as="span" gap="sm" className="text-base/6 font-semibold">
						By county
						<CollapseCaret />
					</Flex>
				</CollapseTrigger>

				<CollapsePanel>
					<div className="pt-4">
						{race === undefined ? (
							<Placeholder className="h-64" />
						) : (
							<Grid
								columns={COLUMNS}
								rows={race.counties}
								getKey={(county) => county.fips}
								sort={{ value: sort, onValueChange: setSort }}
								search={{
									value: query,
									onValueChange: setQuery,
									placeholder: 'Search counties',
								}}
								header={{ position: 'sticky' }}
								onRowClick={(county) => onCounty(county.fips)}
							/>
						)}
					</div>
				</CollapsePanel>
			</Collapse>
		</Stack>
	)
}
