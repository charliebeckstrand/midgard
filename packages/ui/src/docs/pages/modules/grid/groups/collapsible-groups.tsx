import { Grid, type GridColumnGroup } from 'ui/grid'
import { columns, people } from '../data.tsx'

// A collapsible group folds to its first column. `defaultCollapsed` starts it
// folded, and `description` is the tooltip of its header.
const groups: GridColumnGroup[] = [
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

export default function CollapsibleGroups() {
	return <Grid columns={columns} rows={people} getKey={(row) => row.id} columnGroups={groups} />
}
