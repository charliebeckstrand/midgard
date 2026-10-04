import { Grid } from 'ui/grid'
import { filterableColumns, people } from '../data.tsx'

export default function ToolbarOnly() {
	// With `contextMenu: false`, the toolbar is the one place for the export
	// and for the column manager.
	return (
		<Grid
			exportable={{ types: ['csv', 'excel'], toolbar: true, contextMenu: false }}
			columnManager={{ toolbar: true, contextMenu: false }}
			columns={filterableColumns}
			rows={people}
			getKey={(row) => row.id}
		/>
	)
}
