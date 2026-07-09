import { useState } from 'react'
import { Stack } from '../../../../components/stack'
import { Grid } from '../../../../modules/grid'
import { code, Example } from '../../../engine'
import { columns, people } from './_data'

const ReorderExample = () => {
	const [order, setOrder] = useState<(string | number)[]>(['name', 'email', 'role', 'status'])

	return (
		<Grid
			reorder
			columns={columns}
			rows={people}
			getKey={(row) => row.id}
			columnOrder={{ value: order, onValueChange: setOrder }}
		/>
	)
}

const ReorderHandlelessExample = () => {
	// `reorder={{ handle: false }}` drops the grip and makes the whole header the
	// drag handle — grab anywhere on a header (pointer or keyboard) to move its
	// column. A sortable header still sorts on click: its sort control keeps the
	// pointer cursor as a more specific child of the grabbable cell.
	const [order, setOrder] = useState<(string | number)[]>(['name', 'email', 'role', 'status'])

	return (
		<Grid
			reorder={{ handle: false }}
			columns={columns}
			rows={people}
			getKey={(row) => row.id}
			columnOrder={{ value: order, onValueChange: setOrder }}
		/>
	)
}

const RowReorderExample = () => {
	// The consumer owns `rows`, so `rowReorder.onReorder` reports the reordered set
	// to commit back onto state. Add a `dragHandle` column for the grip; drag a row
	// by its handle (pointer or keyboard) to move it within the set.
	const [items, setItems] = useState(people)

	return (
		<Grid
			columns={[{ id: 'drag', dragHandle: true }, ...columns]}
			rows={items}
			getKey={(row) => row.id}
			rowLabel={(row) => row.name}
			rowReorder={{ onReorder: setItems }}
		/>
	)
}

export function Demo() {
	return (
		<Stack gap="xl">
			<Example title="Column reorder: with handle">
				<ReorderExample />
			</Example>

			<Example
				title="Column reorder: without handle"
				code={code`<Grid reorder={{ handle: false }} columns={columns} />`}
			>
				<ReorderHandlelessExample />
			</Example>

			<Example
				title="Row reorder"
				code={code`<Grid columns={[{ id: 'drag', dragHandle: true }, ...]} rowReorder={{ onReorder }} />`}
			>
				<RowReorderExample />
			</Example>
		</Stack>
	)
}
