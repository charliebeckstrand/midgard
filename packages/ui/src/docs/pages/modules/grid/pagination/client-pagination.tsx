import { Grid } from 'ui/grid'
import { columns, manyPeople } from '../data.tsx'

export default function ClientPagination() {
	return (
		<Grid
			columns={columns}
			rows={manyPeople}
			getKey={(row) => row.id}
			tableProps={{ 'aria-label': 'People, client pages' }}
			pagination={{ defaultValue: { pageIndex: 0, pageSize: 10 }, pageSizeOptions: [10, 25, 50] }}
		/>
	)
}
