import { useState } from 'react'
import { Badge } from 'ui/badge'
import { Grid } from 'ui/grid'
import { Stack } from 'ui/stack'
import { Text } from 'ui/text'
import { columns, people } from '../data.tsx'

export default function ExpandableRows() {
	const [expanded, setExpanded] = useState<Set<string | number>>(new Set([1]))

	// An `expander` column holds the chevron, and `render` gives the detail of a row.
	return (
		<Grid
			columns={[{ id: 'expand', expander: true }, ...columns]}
			rows={people}
			getKey={(row) => row.id}
			rowLabel={(row) => row.name}
			expandable={{
				value: expanded,
				onValueChange: setExpanded,
				render: (row) => (
					<Stack gap="sm">
						<Text className="font-medium">{row.name}</Text>
						<Text size="sm" tone="muted">
							{row.email} · {row.role} · currently {row.status}
						</Text>
						<Badge color={row.status === 'active' ? 'green' : 'zinc'}>{row.status}</Badge>
					</Stack>
				),
			}}
		/>
	)
}
