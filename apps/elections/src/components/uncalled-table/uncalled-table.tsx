'use client'

import { useState } from 'react'
import { Badge } from 'ui/badge'
import { Collapse, CollapsePanel, CollapseTrigger } from 'ui/collapse'
import { Grid, type GridColumn, type GridSortState } from 'ui/grid'
import { useIntl } from 'ui/primitives/intl'
import { ProgressBar } from 'ui/progress'
import { Flex } from 'ui/structure/flex'
import { Swatch } from 'ui/swatch'
import type { Election } from '../../elections/registry'
import { useDrawerStep } from '../../hooks/use-drawer-step'
import { marginLabel, percentText } from '../../utilities/race-math'
import { entryKey, entryName, entryStep, type RaceEntry } from '../../utilities/results'
import { CollapseCaret } from '../collapse-caret'

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
 * Every race not called, in a section that opens on a click: a table with
 * sortable columns, the closest lead first. A row opens its race in the Drawer.
 */
export function UncalledTable({
	election,
	entries,
}: {
	election: Election
	entries: readonly RaceEntry[]
}) {
	const { go } = useDrawerStep(election)

	const [sort, setSort] = useState<GridSortState[]>([{ column: 'lead', direction: 'asc' }])

	return (
		<Collapse>
			<CollapseTrigger>
				<Flex as="span" gap="sm" className="text-base/6 font-semibold">
					Every race not called
					<Badge variant="soft" color="amber">
						{entries.length}
					</Badge>
					<CollapseCaret />
				</Flex>
			</CollapseTrigger>

			<CollapsePanel>
				<div className="pt-4">
					<Grid
						columns={COLUMNS}
						rows={[...entries]}
						getKey={entryKey}
						sort={{ value: sort, onValueChange: setSort }}
						onRowClick={(entry) => go(entryStep(entry))}
					/>
				</div>
			</CollapsePanel>
		</Collapse>
	)
}
