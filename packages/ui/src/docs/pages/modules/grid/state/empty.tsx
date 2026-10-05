import { Grid } from 'ui/grid'
import { columns } from '../data.tsx'

export default function Empty() {
	return <Grid columns={columns} rows={[]} getKey={(row) => row.id} />
}
