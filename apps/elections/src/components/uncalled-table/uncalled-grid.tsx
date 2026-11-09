'use client'

import { Grid, type GridColumn, type GridSortState } from 'ui/grid'
import { useIntl } from 'ui/primitives/intl'
import { ProgressBar } from 'ui/progress'
import { Flex } from 'ui/structure/flex'
import { Swatch } from 'ui/swatch'
import { marginLabel, percentText } from '../../utilities/race-math'
import { entryKey, entryName, type RaceEntry } from '../../utilities/results'

function ReportingCell({ reporting }: { reporting: number }) {
	const intl = useIntl()

	return (
		<Flex as="span" gap="sm">
			<ProgressBar aria-label="Reporting" value={reporting} size="xs" className="w-16 shrink-0" />

			<span className="tabular-nums">{percentText(intl.formatNumber, reporting, 0)}</span>
		</Flex>
	)
}

const COLUMNS: GridColumn<RaceEntry>[] = [
	{
		id: 'race',
		title: 'Race',
		cell: entryName,
		value: entryName,
	},
	{
		id: 'office',
		title: 'Office',
		cell: (entry) => entry.contest.label,
		value: (entry) => entry.contest.label,
	},
	{
		id: 'leader',
		title: 'Leader',
		cell: (entry) => {
			const leader = entry.candidates[0]

			return leader === undefined ? null : (
				<Flex as="span" gap="sm">
					<Swatch color={leader.slot} />
					{leader.name}
				</Flex>
			)
		},
		value: (entry) => entry.candidates[0]?.name ?? '',
	},
	{
		id: 'lead',
		title: 'Lead',
		// The lead sorts by its number, not by its label.
		cell: (entry) => <span className="tabular-nums">{marginLabel(entry.candidates)}</span>,
		value: (entry) => entry.lead ?? Number.POSITIVE_INFINITY,
	},
	{
		id: 'reporting',
		title: 'Reporting',
		cell: (entry) => <ReportingCell reporting={entry.reporting} />,
		value: (entry) => entry.reporting,
	},
]

/**
 * The table of {@link UncalledTable}: the races not called, with sortable
 * columns. It is the entry of a lazy chunk, so the Grid loads only when the
 * table first opens.
 */
export function UncalledGrid({
	entries,
	sort,
	onSortChange,
	onPick,
}: {
	entries: readonly RaceEntry[]
	sort: GridSortState[]
	onSortChange: (sort: GridSortState[]) => void
	onPick: (entry: RaceEntry) => void
}) {
	return (
		<Grid
			columns={COLUMNS}
			rows={[...entries]}
			getKey={entryKey}
			sort={{ value: sort, onValueChange: onSortChange }}
			onRowClick={onPick}
			tableProps={{ 'aria-label': 'Every race not called' }}
		/>
	)
}
