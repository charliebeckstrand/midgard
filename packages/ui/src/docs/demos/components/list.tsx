import { useState } from 'react'
import { List, ListDescription, ListItem, ListLabel } from '../../../components/list'
import { Stack } from '../../../structure/stack'
import { Axes, Example } from '../../engine'

type Task = { id: string; label: string; description?: string }

const initialTasks: Task[] = [
	{ id: 'a', label: 'Design the sortable hook API' },
	{ id: 'b', label: 'Write pointer-event reordering logic' },
	{ id: 'c', label: 'Add keyboard a11y (Space to grab, arrows to move)' },
	{ id: 'd', label: 'Ship docs and tests' },
]

// Short labels keep a horizontal list inside its frame.
const stages: Task[] = [
	{ id: 'plan', label: 'Plan' },
	{ id: 'build', label: 'Build' },
	{ id: 'ship', label: 'Ship' },
]

const describedTasks: Task[] = [
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

function VerticalExample() {
	const [tasks, setTasks] = useState(initialTasks)

	return (
		<Example title="Sortable">
			<Stack gap="sm">
				<List items={tasks} getKey={(t) => t.id} onReorder={setTasks} aria-label="Tasks">
					{(task) => (
						<ListItem>
							<ListLabel>{task.label}</ListLabel>
						</ListItem>
					)}
				</List>
			</Stack>
		</Example>
	)
}

function HorizontalExample() {
	const [items, setItems] = useState([
		{ id: '1', label: 'Todo' },
		{ id: '2', label: 'In Progress' },
		{ id: '3', label: 'Review' },
		{ id: '4', label: 'Done' },
	])

	return (
		<Example title="Horizontal">
			<List
				items={items}
				getKey={(i) => i.id}
				onReorder={setItems}
				orientation="horizontal"
				aria-label="Columns"
			>
				{(item) => (
					<ListItem>
						<ListLabel>{item.label}</ListLabel>
					</ListItem>
				)}
			</List>
		</Example>
	)
}

function WithDescriptionsExample() {
	const [tasks, setTasks] = useState(describedTasks)

	return (
		<Example title="With descriptions">
			<List items={tasks} getKey={(t) => t.id} onReorder={setTasks} aria-label="Tasks">
				{(task) => (
					<ListItem>
						<ListLabel>{task.label}</ListLabel>
						{task.description ? <ListDescription>{task.description}</ListDescription> : null}
					</ListItem>
				)}
			</List>
		</Example>
	)
}

export function Demo() {
	return (
		<>
			<Axes
				of="List"
				omit={['sortable', 'virtual']}
				render={(props, label) => (
					<List {...props} items={stages} getKey={(stage) => stage.id} aria-label={label}>
						{(stage) => (
							<ListItem>
								<ListLabel>{stage.label}</ListLabel>
							</ListItem>
						)}
					</List>
				)}
			/>

			<Axes
				of="ListItem"
				title="List item"
				render={(props, label) => (
					<List variant="plain" sortable={false} items={stages} aria-label={label}>
						{(stage) => (
							<ListItem {...props}>
								<ListLabel>{stage.label}</ListLabel>
							</ListItem>
						)}
					</List>
				)}
			/>

			<VerticalExample />
			<HorizontalExample />
			<WithDescriptionsExample />
		</>
	)
}
