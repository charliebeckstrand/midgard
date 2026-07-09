import { useState } from 'react'
import { Badge } from '../../../../components/badge'
import { Stack } from '../../../../components/stack'
import { Grid, type GridColumn } from '../../../../modules/grid'
import { code, Example } from '../../../engine'
import { filterableColumns, people, searchableColumns } from './_data'

type Ticket = { id: number; title: string; due: string; estimate: number; resolved: boolean }

const tickets: Ticket[] = [
	{ id: 1, title: 'Fix login redirect', due: '2026-01-15', estimate: 3, resolved: true },
	{ id: 2, title: 'Add dark mode', due: '2026-03-01', estimate: 8, resolved: false },
	{ id: 3, title: 'Upgrade dependencies', due: '2026-02-10', estimate: 13, resolved: false },
	{ id: 4, title: 'Write API docs', due: '2026-04-20', estimate: 5, resolved: true },
]

// `date` filters compare an ISO `YYYY-MM-DD` value (before / on / after); `number`
// adds a two-bound "between" range; `boolean` offers is-true / is-false with no
// value input.
const ticketColumns: GridColumn<Ticket>[] = [
	{
		id: 'title',
		title: 'Title',
		cell: (row) => row.title,
		value: (row) => row.title,
		filterable: true,
	},
	{
		id: 'due',
		title: 'Due',
		cell: (row) => row.due,
		value: (row) => row.due,
		filterable: true,
		filterType: 'date',
	},
	{
		id: 'estimate',
		title: 'Estimate (h)',
		cell: (row) => row.estimate,
		value: (row) => row.estimate,
		filterable: true,
		filterType: 'number',
	},
	{
		id: 'resolved',
		title: 'Resolved',
		cell: (row) => (
			<Badge color={row.resolved ? 'green' : 'zinc'}>{row.resolved ? 'Yes' : 'No'}</Badge>
		),
		value: (row) => row.resolved,
		filterable: true,
		filterType: 'boolean',
	},
]

const SearchExample = () => {
	const [query, setQuery] = useState('')

	return (
		<Grid
			columns={searchableColumns}
			rows={people}
			getKey={(row) => row.id}
			search={{ value: query, onValueChange: setQuery, placeholder: 'Search people' }}
		/>
	)
}

const ColumnFiltersExample = () => (
	<Grid columns={filterableColumns} rows={people} getKey={(row) => row.id} />
)

const DateBooleanFilterExample = () => (
	<Grid columns={ticketColumns} rows={tickets} getKey={(row) => row.id} />
)

export function Demo() {
	return (
		<Stack gap="xl">
			<Example title="Search" code={code`<Grid search={{ value, onValueChange }} />`}>
				<SearchExample />
			</Example>

			<Example
				title="Column filters"
				code={code`<Grid columns={[{ ...col, filterable: true }]} />`}
			>
				<ColumnFiltersExample />
			</Example>

			<Example
				title="Date, number & boolean filters"
				code={code`<Grid columns={[{ ...col, filterable: true, filterType: 'number' }]} />`}
			>
				<DateBooleanFilterExample />
			</Example>
		</Stack>
	)
}
