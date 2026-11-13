import { Grid } from 'ui/grid'
import { columns, people } from '../data.tsx'

export default function ColumnReorderWithHandle() {
	return <Grid reorder columns={columns} rows={people} getKey={(row) => row.id} />
}
