'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Badge } from 'ui/badge'
import { Collapse, CollapsePanel, CollapseTrigger } from 'ui/collapse'
import { Grid, type GridColumn, type GridSortState } from 'ui/grid'
import { useIntl } from 'ui/primitives/intl'
import { ProgressBar } from 'ui/progress'
import { Flex } from 'ui/structure/flex'
import { Swatch } from 'ui/swatch'
import { marginLabel, percentText } from '../../utilities/race-math'
import { entryName, type RaceEntry } from '../../utilities/results'

/** One race of {@link UncalledTable}, with the page it leads to. */
export type UncalledRow = { key: string; entry: RaceEntry; href: string }

function ReportingCell({ reporting }: { reporting: number }) {
	const intl = useIntl()

	return (
		<Flex as="span" gap="sm">
			<ProgressBar aria-label="Reporting" value={reporting} size="xs" className="w-16 shrink-0" />

			<span className="tabular-nums">{percentText(intl.formatNumber, reporting, 0)}</span>
		</Flex>
	)
}

const COLUMNS: GridColumn<UncalledRow>[] = [
	{
		id: 'race',
		title: 'Race',
		cell: (row) => entryName(row.entry),
		value: (row) => entryName(row.entry),
	},
	{
		id: 'office',
		title: 'Office',
		cell: (row) => row.entry.contest.label,
		value: (row) => row.entry.contest.label,
	},
	{
		id: 'leader',
		title: 'Leader',
		cell: (row) => {
			const leader = row.entry.candidates[0]

			return leader === undefined ? null : (
				<Flex as="span" gap="sm">
					<Swatch color={leader.slot} />
					{leader.name}
				</Flex>
			)
		},
		value: (row) => row.entry.candidates[0]?.name ?? '',
	},
	{
		id: 'lead',
		title: 'Lead',
		// The lead sorts by its number, not by its label.
		cell: (row) => <span className="tabular-nums">{marginLabel(row.entry.candidates)}</span>,
		value: (row) => row.entry.lead ?? Number.POSITIVE_INFINITY,
	},
	{
		id: 'reporting',
		title: 'Reporting',
		cell: (row) => <ReportingCell reporting={row.entry.reporting} />,
		value: (row) => row.entry.reporting,
	},
]

/**
 * Every race not called, in a section that opens on a click: a table with
 * sortable columns, the closest lead first. A row opens the page of its race.
 */
export function UncalledTable({ rows }: { rows: readonly UncalledRow[] }) {
	const router = useRouter()

	const [sort, setSort] = useState<GridSortState[]>([{ column: 'lead', direction: 'asc' }])

	return (
		<Collapse>
			<CollapseTrigger>
				<Flex as="span" gap="sm" className="text-base/6 font-semibold">
					Every race not called
					<Badge variant="soft" color="amber">
						{rows.length}
					</Badge>
				</Flex>
			</CollapseTrigger>

			<CollapsePanel>
				<div className="pt-4">
					<Grid
						columns={COLUMNS}
						rows={[...rows]}
						getKey={(row) => row.key}
						sort={{ value: sort, onValueChange: setSort }}
						onRowClick={(row) => router.push(row.href)}
					/>
				</div>
			</CollapsePanel>
		</Collapse>
	)
}
