'use client'

import { useMemo, useState } from 'react'
import { Card } from 'ui/card'
import { DateTime } from 'ui/date-time'
import { DescriptionDetails, DescriptionList, DescriptionTerm } from 'ui/description-list'
import { Grid, type GridColumn, type GridSortState } from 'ui/grid'
import { Heading } from 'ui/heading'
import { useIntl } from 'ui/primitives/intl'
import { Flex } from 'ui/structure/flex'
import { Stack } from 'ui/structure/stack'
import { useDrawerParam } from '../../hooks/use-drawer-param'
import type { CountyResult, Race } from '../../types'
import { COUNTY_PARAM } from '../../utilities/elections-url'
import { isCalled, marginLabel, percentText } from '../../utilities/race-math'
import { RaceSummary } from '../race-summary'
import { ResultDrawer } from '../result-drawer'

/** Props for {@link RacePage}. */
export type RacePageProps = {
	race: Race
	/** The name of the state, the first step of the trail of the county Drawer. */
	stateName: string
	/** The race under the trail of the county Drawer, such as `Senate` or `House, 6th District`. */
	raceLabel: string
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
 * The page of one race, the tab of a statewide office and the page of a
 * district: the candidates with the facts of the race beside them, then the
 * counties in a table. A county row opens the county Drawer (`?county=13121`).
 */
export function RacePage({ race, stateName, raceLabel }: RacePageProps) {
	const [query, setQuery] = useState('')

	const [sort, setSort] = useState<GridSortState[]>([{ column: 'votes', direction: 'desc' }])

	const drawer = useDrawerParam(COUNTY_PARAM)

	const county = useMemo(
		() => race.counties.find((entry) => entry.fips === drawer.value),
		[race.counties, drawer.value],
	)

	return (
		<>
			<Card>
				<Flex direction={{ initial: 'col', md: 'row' }} align="start" gap="xl">
					<Stack flex="1" className="w-full min-w-0">
						<RaceSummary
							candidates={race.candidates}
							reporting={race.reporting}
							called={isCalled(race.candidates)}
							rows="all"
							detail
						/>
					</Stack>

					<div className="w-full shrink-0 md:w-64">
						<RaceFacts race={race} />
					</div>
				</Flex>
			</Card>

			<Stack as="div" gap="lg">
				<Heading level={2}>By county</Heading>

				<Grid
					columns={COLUMNS}
					rows={race.counties}
					getKey={(entry) => entry.fips}
					sort={{ value: sort, onValueChange: setSort }}
					search={{ value: query, onValueChange: setQuery, placeholder: 'Search counties' }}
					header={{ position: 'sticky' }}
					maxHeight="440px"
					onRowClick={(entry) => drawer.open(entry.fips)}
				/>
			</Stack>

			<ResultDrawer
				view={
					county === undefined
						? null
						: {
								steps: [{ label: stateName, onPick: drawer.close }, { label: county.name }],
								subtitle: raceLabel,
								body: (
									<RaceSummary
										candidates={county.candidates}
										reporting={county.reporting}
										called={isCalled(race.candidates)}
										rows="all"
									/>
								),
							}
				}
				onClose={drawer.close}
			/>
		</>
	)
}
