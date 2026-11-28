import { useState } from 'react'
import { List, ListHandle, ListItem, ListItemMenu, ListLabel } from 'ui/list'

const initialTasks = [
	{ id: 'a', label: 'Write the release notes' },
	{ id: 'b', label: 'Update the pricing page' },
	{ id: 'c', label: 'Test the checkout flow' },
	{ id: 'd', label: 'Send the launch email' },
]

// With `handle={false}`, the list inserts no handle and no move menu, and each
// item places its own `ListHandle` and `ListItemMenu`, here at the end of the
// row.
export default function HandleAtTheEnd() {
	const [tasks, setTasks] = useState(initialTasks)

	return (
		<List
			items={tasks}
			getKey={(task) => task.id}
			onReorder={setTasks}
			handle={false}
			aria-label="Tasks"
		>
			{(task) => (
				<ListItem
					suffix={
						<>
							<ListItemMenu />
							<ListHandle />
						</>
					}
				>
					<ListLabel>{task.label}</ListLabel>
				</ListItem>
			)}
		</List>
	)
}
