import { Badge } from 'ui/badge'
import { Grid, type GridColumn } from 'ui/grid'
import { type Task, tasks } from '../../../../data/tasks.ts'
import { DayText } from '../data.tsx'

// The tasks, with a yes or no field for the boolean filter.
type Ticket = Pick<Task, 'id' | 'title' | 'due' | 'estimate'> & { resolved: boolean }

const tickets: Ticket[] = tasks.map(({ id, title, due, estimate, status }) => ({
	id,
	title,
	due,
	estimate,
	resolved: status === 'done',
}))

// The ISO text of a day, in the form that the date filter compares.
function isoDay(date: Date): string {
	const month = String(date.getMonth() + 1).padStart(2, '0')

	const day = String(date.getDate()).padStart(2, '0')

	return `${date.getFullYear()}-${month}-${day}`
}

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
		cell: (row) => <DayText date={row.due} />,
		value: (row) => isoDay(row.due),
		filterable: true,
		filterType: 'date',
	},
	{
		id: 'estimate',
		title: 'Estimate (hours)',
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
