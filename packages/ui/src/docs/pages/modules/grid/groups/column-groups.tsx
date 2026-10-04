import { Grid } from 'ui/grid'
import { columns, people } from '../data.tsx'
import { columnGroups } from './data.ts'

export default function ColumnGroups() {
	return (
		<Grid columns={columns} rows={people} getKey={(row) => row.id} columnGroups={columnGroups} />
	)
}
