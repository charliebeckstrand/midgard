import { Grid } from 'ui/grid'
import { columns, people } from '../data.tsx'

export default function ColumnReorderWithoutHandle() {
	// With no handle, the whole header moves its column. A sortable header
	// still sorts on a click.
	return (
		<Grid reorder={{ handle: false }} columns={columns} rows={people} getKey={(row) => row.id} />
	)
}
