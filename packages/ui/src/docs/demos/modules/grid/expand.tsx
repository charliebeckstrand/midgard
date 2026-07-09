import { useState } from 'react'
import { Badge } from '../../../../components/badge'
import { Stack } from '../../../../components/stack'
import { Text } from '../../../../components/text'
import { Grid, type GridColumn } from '../../../../modules/grid'
import { code, Example } from '../../../engine'
import { columns, type Person, people } from './_data'

// An `expander` column renders the disclosure chevron; the `expandable` binding
// carries the detail renderer — an arbitrary sub-component per row.
const masterDetailColumns: GridColumn<Person>[] = [{ id: 'expand', expander: true }, ...columns]

const MasterDetailExample = () => {
	const [expanded, setExpanded] = useState<Set<string | number>>(new Set([1]))

	return (
		<Grid
			columns={masterDetailColumns}
			rows={people}
			getKey={(row) => row.id}
			rowLabel={(row) => row.name}
			expandable={{
				value: expanded,
				onValueChange: setExpanded,
				render: (row) => (
					<Stack gap="sm">
						<Text className="font-medium">{row.name}</Text>
						<Text size="sm" severity="muted">
							{row.email} · {row.role} · currently {row.status}
						</Text>
						<Badge color={row.status === 'active' ? 'green' : 'zinc'}>{row.status}</Badge>
					</Stack>
				),
			}}
		/>
	)
}

export function Demo() {
	return (
		<Stack gap="xl">
			<Example
				title="Expandable rows"
				code={code`<Grid columns={[{ id: 'expand', expander: true }, ...]} expandable={{ value, onValueChange, render }} />`}
			>
				<MasterDetailExample />
			</Example>
		</Stack>
	)
}
