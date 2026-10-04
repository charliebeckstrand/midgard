import { Grid } from 'ui/grid'
import { columns, people } from '../data.tsx'

export default function CollapsedGroups() {
	// Each group starts collapsed, with its value and its count.
	return (
		<Grid
			columns={columns}
			rows={people}
			getKey={(row) => row.id}
			groupBy={{ value: 'status', defaultExpanded: false }}
		/>
	)
}
