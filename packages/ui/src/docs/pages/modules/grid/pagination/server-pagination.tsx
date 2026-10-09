import { useState } from 'react'
import { Grid, type GridPaginationState } from 'ui/grid'
import { manyPeople, serverColumns } from '../data.tsx'

export default function ServerPagination() {
	const [pagination, setPagination] = useState<GridPaginationState>({ pageIndex: 0, pageSize: 10 })

	// The server gives one page of rows. The slice stands in for the request.
	const start = pagination.pageIndex * pagination.pageSize

	const page = manyPeople.slice(start, start + pagination.pageSize)

	return (
		<Grid
			columns={serverColumns}
			rows={page}
			getKey={(row) => row.id}
			tableProps={{ 'aria-label': 'People, server pages' }}
			pagination={{
				value: pagination,
				onValueChange: setPagination,
				rowCount: manyPeople.length,
				pageSizeOptions: [10, 25],
			}}
		/>
	)
}
