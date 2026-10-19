import { Grid } from 'ui/grid'
import { columns, people } from '../data.tsx'

export default function ResizableColumns() {
	return <Grid resizable columns={columns} rows={people} getKey={(row) => row.id} />
}
