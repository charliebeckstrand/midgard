import { Grid } from 'ui/grid'
import { columns } from '../data.tsx'

export default function Loading() {
	return <Grid loading columns={columns} rows={[]} getKey={(row) => row.id} />
}
