import { useState } from 'react'
import { List, ListDescription, ListItem, ListLabel } from 'ui/list'

const initialTasks = [
	{
		id: 'a',
		label: 'Design the sortable hook API',
		description: 'Decide on the surface area before writing any code',
	},
	{
		id: 'b',
		label: 'Write pointer-event reordering logic',
		description: 'Handle mouse, touch, and pen inputs',
	},
	{
		id: 'c',
		label: 'Add keyboard a11y',
		description: 'Space to grab, arrows to move, Escape to cancel',
	},
	{ id: 'd', label: 'Ship docs and tests', description: 'Vertical, horizontal, disabled states' },
]

export default function WithDescriptions() {
	const [tasks, setTasks] = useState(initialTasks)

	return (
		<List items={tasks} getKey={(task) => task.id} onReorder={setTasks} aria-label="Tasks">
			{(task) => (
				<ListItem>
					<ListLabel>{task.label}</ListLabel>
					<ListDescription>{task.description}</ListDescription>
				</ListItem>
			)}
		</List>
	)
}
