import { useState } from 'react'
import { ListItem, ListLabel, ListSortable } from 'ui/list'

const initialColumns = [
	{ id: 'todo', label: 'Todo' },
	{ id: 'in-progress', label: 'In progress' },
	{ id: 'review', label: 'Review' },
	{ id: 'done', label: 'Done' },
]

export default function Horizontal() {
	const [columns, setColumns] = useState(initialColumns)

	return (
		<ListSortable
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
		</ListSortable>
	)
}
