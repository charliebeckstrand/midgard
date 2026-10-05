import { Grid } from 'ui/grid'
import { filterableColumns, people } from '../data.tsx'

export default function ColumnFilters() {
	return <Grid columns={filterableColumns} rows={people} getKey={(row) => row.id} />
}
