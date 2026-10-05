import { useState } from 'react'
import { List, ListItem, ListLabel } from 'ui/list'

const initialColumns = [
	{ id: 'todo', label: 'Todo' },
	{ id: 'in-progress', label: 'In progress' },
	{ id: 'review', label: 'Review' },
	{ id: 'done', label: 'Done' },
]

export default function Horizontal() {
	const [columns, setColumns] = useState(initialColumns)

	return (
		<List
			items={columns}
			getKey={(column) => column.id}
			onReorder={setColumns}
			orientation="horizontal"
			aria-label="Columns"
		>
			{(column) => (
				<ListItem>
					<ListLabel>{column.label}</ListLabel>
				</ListItem>
			)}
		</List>
	)
}
