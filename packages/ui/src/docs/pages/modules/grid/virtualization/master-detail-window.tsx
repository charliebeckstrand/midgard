import { Grid, type GridColumn } from 'ui/grid'
import { Text } from 'ui/text'
import { columns, manyPeople, type Person } from '../data.tsx'

const expandColumns: GridColumn<Person>[] = [{ id: 'expand', expander: true }, ...columns]

export default function MasterDetailWindow() {
	// The window holds each row and each open detail. A closed detail does not
	// render, so it keeps no state.
	return (
		<Grid
			columns={expandColumns}
			rows={manyPeople}
			getKey={(row) => row.id}
			rowLabel={(row) => row.name}
			header={{ position: 'sticky' }}
			virtualize
			maxHeight="320px"
			expandable={{
				render: (row) => (
					<Text size="sm" tone="muted">
						{row.email} · {row.role} · currently {row.status}
					</Text>
				),
			}}
		/>
	)
}
