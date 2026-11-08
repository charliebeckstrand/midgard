'use client'

import { useState } from 'react'
import { DateTime } from 'ui/date-time'
import { DescriptionDetails, DescriptionList, DescriptionTerm } from 'ui/description-list'
import { Grid, type GridColumn, type GridSortState } from 'ui/grid'
import { Heading } from 'ui/heading'
import { Placeholder } from 'ui/placeholder'
import { useIntl } from 'ui/primitives/intl'
import { Stack } from 'ui/structure/stack'
import type { CountyResult, Race } from '../../types'
import { isCalled, marginLabel, percentText } from '../../utilities/race-math'
import type { RaceEntry } from '../../utilities/results'
import { RaceSummary } from '../race-summary'

/** Props for {@link RaceDetail}. */
export type RaceDetailProps = {
	/** The race of the national results, which the Drawer has before the race loads. */
	entry: Pick<RaceEntry, 'candidates' | 'reporting' | 'called'>
	/** The race with its counties, or `undefined` while it loads. */
	race: Race | undefined
	/** Opens a county of the race, by its FIPS code. */
	onCounty: (fips: string) => void
}

/** The time format of the polls and the call: the day and the time, in the zone of the reader. */
const WHEN: Intl.DateTimeFormatOptions = { dateStyle: 'medium', timeStyle: 'short' }

/** The facts of a race beside its candidates: the votes, the percent reporting, the polls, and the call. */
function RaceFacts({ race }: { race: Race }) {
	const intl = useIntl()

	const votes = race.candidates.reduce((sum, candidate) => sum + candidate.votes, 0)

	return (
		<DescriptionList>
			<DescriptionTerm>Total votes</DescriptionTerm>
			<DescriptionDetails className="tabular-nums">{intl.formatNumber(votes)}</DescriptionDetails>

			<DescriptionTerm>Reporting</DescriptionTerm>
			<DescriptionDetails className="tabular-nums">
				{percentText(intl.formatNumber, race.reporting, 1)}
			</DescriptionDetails>

			{race.pollsClose === null ? null : (
				<>
					<DescriptionTerm>Polls closed</DescriptionTerm>
					<DescriptionDetails>
						<DateTime value={race.pollsClose} format={WHEN} />
					</DescriptionDetails>
				</>
			)}

			{race.calledAt === null ? null : (
				<>
					<DescriptionTerm>Called</DescriptionTerm>
					<DescriptionDetails>
						<DateTime value={race.calledAt} format={WHEN} />
					</DescriptionDetails>
				</>
			)}
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
 * counties in a table. A county row opens the county. The candidates show from
 * the national results at once; the facts and the counties show when the race
 * loads, and a still shape holds their place until then.
 */
export function RaceDetail({ entry, race, onCounty }: RaceDetailProps) {
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

			{race === undefined ? (
				<Stack gap="lg">
					<Placeholder className="h-24" />

					<Placeholder className="h-64" />
				</Stack>
			) : (
				<>
					<RaceFacts race={race} />

					<Stack as="div" gap="lg">
						<Heading level={3}>By county</Heading>

						<Grid
							columns={COLUMNS}
							rows={race.counties}
							getKey={(county) => county.fips}
							sort={{ value: sort, onValueChange: setSort }}
							search={{ value: query, onValueChange: setQuery, placeholder: 'Search counties' }}
							header={{ position: 'sticky' }}
							onRowClick={(county) => onCounty(county.fips)}
						/>
					</Stack>
				</>
			)}
		</Stack>
	)
}
