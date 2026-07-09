import { useMemo, useState } from 'react'
import { Stack } from '../../../../components/stack'
import { Grid, type GridPaginationState } from '../../../../modules/grid'
import { code, Example } from '../../../engine'
import { columns, manyPeople } from './_data'

const ServerPaginationExample = () => {
	const [pagination, setPagination] = useState<GridPaginationState>({ pageIndex: 0, pageSize: 10 })

	// Stand-in for a server fetch: slice the requested page from the full set.
	const page = useMemo(
		() =>
			manyPeople.slice(
				pagination.pageIndex * pagination.pageSize,
				pagination.pageIndex * pagination.pageSize + pagination.pageSize,
			),
		[pagination],
	)

	return (
		<Grid
			columns={columns}
			rows={page}
			getKey={(row) => row.id}
			pagination={{
				value: pagination,
				onValueChange: setPagination,
				rowCount: manyPeople.length,
				pageSizeOptions: [10, 25],
			}}
		/>
	)
}

const ClientPaginationExample = () => (
	<Grid
		columns={columns}
		rows={manyPeople}
		getKey={(row) => row.id}
		pagination={{
			defaultValue: { pageIndex: 0, pageSize: 10 },
			pageSizeOptions: [10, 25, 50],
		}}
	/>
)

export function Demo() {
	return (
		<Stack gap="xl">
			<Example
				title="Server pagination"
				code={code`<Grid pagination={{ value, onValueChange, rowCount }} />`}
			>
				<ServerPaginationExample />
			</Example>

			<Example title="Client pagination">
				<ClientPaginationExample />
			</Example>
		</Stack>
	)
}
