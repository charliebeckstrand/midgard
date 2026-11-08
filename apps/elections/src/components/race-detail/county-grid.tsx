'use client'

import { Grid, type GridColumn, type GridSortState } from 'ui/grid'
import { useIntl } from 'ui/primitives/intl'
import type { CountyResult } from '../../types'
import { marginLabel, percentText } from '../../utilities/race-math'

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
 * The county table of {@link RaceDetail}: sortable, with a search, and a row
 * opens its county. It is the entry of a lazy chunk, so the Grid loads only
 * when the table first opens.
 */
export function CountyGrid({
	counties,
	sort,
	onSortChange,
	query,
	onQueryChange,
	onCounty,
}: {
	counties: CountyResult[]
	sort: GridSortState[]
	onSortChange: (sort: GridSortState[]) => void
	query: string
	onQueryChange: (query: string) => void
	onCounty: (fips: string) => void
}) {
	return (
		<Grid
			columns={COLUMNS}
			rows={counties}
			getKey={(county) => county.fips}
			sort={{ value: sort, onValueChange: onSortChange }}
			search={{ value: query, onValueChange: onQueryChange, placeholder: 'Search counties' }}
			header={{ position: 'sticky' }}
			onRowClick={(county) => onCounty(county.fips)}
		/>
	)
}
