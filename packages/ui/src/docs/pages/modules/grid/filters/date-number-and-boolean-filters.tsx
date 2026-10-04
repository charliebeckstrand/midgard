import { Badge } from 'ui/badge'
import { Grid, type GridColumn } from 'ui/grid'

type Ticket = { id: number; title: string; due: string; estimate: number; resolved: boolean }

const tickets: Ticket[] = [
	{ id: 1, title: 'Fix login redirect', due: '2026-01-15', estimate: 3, resolved: true },
	{ id: 2, title: 'Add dark mode', due: '2026-03-01', estimate: 8, resolved: false },
	{ id: 3, title: 'Upgrade dependencies', due: '2026-02-10', estimate: 13, resolved: false },
	{ id: 4, title: 'Write API docs', due: '2026-04-20', estimate: 5, resolved: true },
]

// A `date` filter compares an ISO date: before, on, or after. A `number`
// filter adds a range. A `boolean` filter is true or false, with no input.
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

export default function DateNumberAndBooleanFilters() {
	return <Grid columns={ticketColumns} rows={tickets} getKey={(row) => row.id} />
}
