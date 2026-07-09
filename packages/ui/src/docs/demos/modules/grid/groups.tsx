import { useState } from 'react'
import { Stack } from '../../../../components/stack'
import { Tab, TabContent, TabContents, TabList, Tabs } from '../../../../components/tabs'
import {
	Grid,
	type GridColumn,
	type GridColumnGroup,
	type GridRowGroup,
} from '../../../../modules/grid'
import { code, Example } from '../../../engine'
import { columns, people, sortableColumns } from './_data'
import { ServerGroupingExample } from './_server-grouping'

// A `groups` array bands a contiguous run of columns under a colored, labeled
// header. Each group names its member `columns` (kept adjacent and moved as a
// block), a `title`, and a `color` from the standard + extended Badge palette.
const columnGroups: GridColumnGroup[] = [
	{ id: 'contact', title: 'Contact', color: 'blue', columns: ['name', 'email'] },
	{ id: 'org', title: 'Organization', color: 'violet', columns: ['role', 'status'] },
]

const GroupsExample = () => (
	<Grid columns={columns} rows={people} getKey={(row) => row.id} groups={columnGroups} />
)

// A `collapsible` group folds to its first column behind an expand toggle,
// hiding the rest until reopened; `defaultCollapsed` seeds it folded. `icon` and
// `description` (a tooltip) round out the band.
const collapsibleGroups: GridColumnGroup[] = [
	{
		id: 'contact',
		title: 'Contact',
		color: 'blue',
		description: 'How to reach this person',
		columns: ['name', 'email'],
		collapsible: true,
	},
	{
		id: 'org',
		title: 'Organization',
		color: 'violet',
		columns: ['role', 'status'],
		collapsible: true,
		defaultCollapsed: true,
	},
]

const CollapsibleGroupsExample = () => (
	<Grid columns={columns} rows={people} getKey={(row) => row.id} groups={collapsibleGroups} />
)

// Passing a `groups` binding turns on the column manager's group editor: a "New
// group" button, a zone per group (name, color, remove), and an ungrouped pool.
// Drag columns between zones — or use a row's "Move" menu — to change membership.
const GroupManagerExample = () => {
	const [groups, setGroups] = useState<GridColumnGroup[]>(columnGroups)

	return (
		<Grid
			columns={columns}
			rows={people}
			getKey={(row) => row.id}
			groups={{ value: groups, onValueChange: setGroups }}
			columnManager={{ toolbarButton: true }}
		/>
	)
}

const RowGroupExample = () => {
	return (
		<Stack gap="md">
			<Grid
				columns={sortableColumns}
				rows={people}
				getKey={(row) => row.id}
				groupBy={{ value: 'role', onValueChange: () => {} }}
			/>
		</Stack>
	)
}

const CollapsedGroupExample = () => (
	// `defaultExpanded: false` starts every group collapsed — just the value/count
	// summaries — until a header is expanded.
	<Grid
		columns={columns}
		rows={people}
		getKey={(row) => row.id}
		groupBy={{ value: 'status', defaultExpanded: false }}
	/>
)

type Sale = { id: number; region: string; rep: string; units: number; revenue: number }

const salesData: Sale[] = [
	{ id: 1, region: 'West', rep: 'Wade', units: 12, revenue: 1440 },
	{ id: 2, region: 'West', rep: 'Tanya', units: 30, revenue: 4200 },
	{ id: 3, region: 'East', rep: 'Devon', units: 22, revenue: 2860 },
	{ id: 4, region: 'East', rep: 'Arlene', units: 41, revenue: 5330 },
	{ id: 5, region: 'West', rep: 'Tom', units: 18, revenue: 2160 },
	{ id: 6, region: 'East', rep: 'Cody', units: 9, revenue: 1170 },
]

const dollars = (value: unknown) => `$${Number(value).toLocaleString('en-US')}`

// A per-column `aggFunc` aggregates on group headers and the total rows; `revenue`
// and `units` sum, while `$/unit` is a weighted ratio — a custom function over
// the rows themselves, since it spans two fields rather than reducing one column.
const salesColumns: GridColumn<Sale>[] = [
	{ id: 'region', title: 'Region', cell: (row) => row.region, value: (row) => row.region },
	{ id: 'rep', title: 'Rep', cell: (row) => row.rep, value: (row) => row.rep },
	{
		id: 'units',
		title: 'Units',
		cell: (row) => String(row.units),
		value: (row) => row.units,
		aggFunc: 'sum',
	},
	{
		id: 'revenue',
		title: 'Revenue',
		cell: (row) => dollars(row.revenue),
		value: (row) => row.revenue,
		aggFunc: 'sum',
		aggCell: ({ value }) => dollars(value),
	},
	{
		id: 'perUnit',
		title: '$/unit',
		cell: (row) => dollars((row.revenue / row.units).toFixed(2)),
		aggFunc: (rows: Sale[]) => {
			const revenue = rows.reduce((sum, row) => sum + row.revenue, 0)

			const units = rows.reduce((sum, row) => sum + row.units, 0)

			return units === 0 ? '' : (revenue / units).toFixed(2)
		},
		aggCell: ({ value }) => (value === '' ? '' : `$${value}`),
	},
]

const AggregationExample = () => (
	<Grid
		columns={salesColumns}
		rows={salesData}
		getKey={(row) => row.id}
		groupBy={{ value: 'region' }}
		groupTotalRow="bottom"
		grandTotalRow="bottom"
	/>
)

// Right-click a group header for "Manage rows": color each group, reorder the
// groups, and reorder rows within a group. A group's color washes its header
// aggregation and total footer (and paints its rail); the overlay is value-keyed
// through `groupBy.rowGroups`, seeded here with two colors.
const RowManagerExample = () => {
	const [rowGroups, setRowGroups] = useState<GridRowGroup[]>([
		{ key: 'West', color: 'blue' },
		{ key: 'East', color: 'amber' },
	])

	return (
		<Grid
			columns={salesColumns}
			rows={salesData}
			getKey={(row) => row.id}
			rowLabel={(row) => row.rep}
			groupBy={{
				value: 'region',
				rowGroups: { value: rowGroups, onValueChange: setRowGroups },
			}}
			groupTotalRow="bottom"
		/>
	)
}

export function Demo() {
	return (
		// A second row of tabs splits column groups (banding a run of columns)
		// from row groups (collecting rows by a column's value).
		<Tabs defaultValue="Column">
			<TabList aria-label="Group type">
				<Tab value="Column">Column</Tab>
				<Tab value="Row">Row</Tab>
			</TabList>
			<TabContents fade={false}>
				<TabContent value="Column">
					<Stack gap="xl">
						<Example
							title="Column groups"
							code={code`<Grid groups={[{ id, title, color, columns: [...] }]} />`}
						>
							<GroupsExample />
						</Example>

						<Example
							title="Collapsible groups"
							code={code`<Grid groups={[{ ...group, collapsible: true, defaultCollapsed }]} />`}
						>
							<CollapsibleGroupsExample />
						</Example>

						<Example
							title="Group editor"
							code={code`<Grid groups={{ value, onValueChange }} columnManager={{ toolbarButton: true }} />`}
						>
							<GroupManagerExample />
						</Example>
					</Stack>
				</TabContent>

				<TabContent value="Row">
					<Stack gap="xl">
						<Example
							title="Row groups"
							code={code`<Grid groupBy={{ value: 'role', onValueChange }} />`}
						>
							<RowGroupExample />
						</Example>

						<Example
							title="Collapsed groups"
							code={code`<Grid groupBy={{ value: 'status', defaultExpanded: false }} />`}
						>
							<CollapsedGroupExample />
						</Example>

						<Example
							title="Aggregation & totals"
							code={code`<Grid groupBy={{ value: 'region' }} groupTotalRow="bottom" grandTotalRow="bottom" columns={[{ …, aggFunc: 'sum' }, { …, aggFunc: (rows) => weightedRatio }]} />`}
						>
							<AggregationExample />
						</Example>

						<Example
							title="Row manager"
							code={code`<Grid groupBy={{ value: 'region', rowGroups: { value, onValueChange } }} groupTotalRow="bottom" />
// right-click a group header → "Manage rows" to color the groups and reorder them`}
						>
							<RowManagerExample />
						</Example>

						<Example
							title="Server-side grouping"
							code={code`<Grid groupBy={{ manual: true, value, onValueChange, groupRow, groupButton: true, expanded, onExpandedChange, onGroupExpand }} />`}
						>
							<ServerGroupingExample />
						</Example>
					</Stack>
				</TabContent>
			</TabContents>
		</Tabs>
	)
}
