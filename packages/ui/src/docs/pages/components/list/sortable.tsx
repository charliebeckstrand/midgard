import { useState } from 'react'
import { List, ListItem, ListLabel } from 'ui/list'

const initialTasks = [
	{ id: 'a', label: 'Write the release notes' },
	{ id: 'b', label: 'Update the pricing page' },
	{ id: 'c', label: 'Test the checkout flow' },
	{ id: 'd', label: 'Send the launch email' },
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
