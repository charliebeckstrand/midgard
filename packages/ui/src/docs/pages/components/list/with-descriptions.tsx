import { useState } from 'react'
import { List, ListDescription, ListItem, ListLabel } from 'ui/list'

const initialTasks = [
	{
		id: 'a',
		label: 'Write the release notes',
		description: 'List the new features and the fixes',
	},
	{
		id: 'b',
		label: 'Update the pricing page',
		description: 'Add the new team plan',
	},
	{
		id: 'c',
		label: 'Test the checkout flow',
		description: 'Check each payment method on a phone',
	},
	{ id: 'd', label: 'Send the launch email', description: 'Send it to all customers on Monday' },
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
