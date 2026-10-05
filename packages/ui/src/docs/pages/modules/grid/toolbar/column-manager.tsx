import { Grid } from 'ui/grid'
import { columns, people } from '../data.tsx'

export default function ColumnManager() {
	// The column manager hides, pins, and moves the columns. The right-click
	// menu of a header opens it, and `toolbar` adds a button for it. The
	// manager moves the columns when `reorder` is on.
	return (
		<Grid
			reorder
			columns={columns}
			rows={people}
			getKey={(row) => row.id}
			columnManager={{ toolbar: true }}
		/>
	)
}
