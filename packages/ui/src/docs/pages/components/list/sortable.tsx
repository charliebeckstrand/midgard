import { useState } from 'react'
import { List, ListItem, ListLabel } from 'ui/list'

const initialTasks = [
	{ id: 'a', label: 'Design the sortable hook API' },
	{ id: 'b', label: 'Write pointer-event reordering logic' },
	{ id: 'c', label: 'Add keyboard a11y (Space to grab, arrows to move)' },
	{ id: 'd', label: 'Ship docs and tests' },
]

export default function Sortable() {
	const [tasks, setTasks] = useState(initialTasks)

	return (
		<List items={tasks} getKey={(task) => task.id} onReorder={setTasks} aria-label="Tasks">
			{(task) => (
				<ListItem>
					<ListLabel>{task.label}</ListLabel>
				</ListItem>
			)}
		</List>
	)
}
