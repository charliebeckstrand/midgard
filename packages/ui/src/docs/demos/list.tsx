'use client'

import { useState } from 'react'
import { List, ListHandle, ListItem, ListLabel } from '../../components/list'
import { Sizer } from '../../components/sizer'
import { Stack } from '../../components/stack'
import { Text } from '../../components/text'
import { Example } from '../components/example'

export const meta = { category: 'Data Display' }

type Task = { id: string; label: string }

const initialTasks: Task[] = [
	{ id: 'a', label: 'Design the sortable hook API' },
	{ id: 'b', label: 'Write pointer-event reordering logic' },
	{ id: 'c', label: 'Add keyboard a11y (Space to grab, arrows to move)' },
	{ id: 'd', label: 'Ship docs and tests' },
]

function Vertical() {
	const [tasks, setTasks] = useState(initialTasks)

	return (
		<Example title="Vertical">
			<Sizer>
				<Stack gap={2}>
					<Text variant="muted">
						Drag a handle, or focus one and press Space, then use arrow keys.
					</Text>
					<List items={tasks} getKey={(t) => t.id} onReorder={setTasks} aria-label="Tasks">
						{(task) => (
							<ListItem>
								<ListHandle />
								<ListLabel>{task.label}</ListLabel>
							</ListItem>
						)}
					</List>
				</Stack>
			</Sizer>
		</Example>
	)
}

function Horizontal() {
	const [items, setItems] = useState([
		{ id: '1', label: 'Todo' },
		{ id: '2', label: 'In Progress' },
		{ id: '3', label: 'Review' },
		{ id: '4', label: 'Done' },
	])

	return (
		<Example title="Horizontal">
			<Sizer>
				<List
					items={items}
					getKey={(i) => i.id}
					onReorder={setItems}
					orientation="horizontal"
					aria-label="Columns"
				>
					{(item) => (
						<ListItem>
							<ListHandle />
							<ListLabel>{item.label}</ListLabel>
						</ListItem>
					)}
				</List>
			</Sizer>
		</Example>
	)
}

function ReadOnly() {
	return (
		<Example title="Read-only">
			<Sizer>
				<List items={initialTasks} getKey={(t) => t.id}>
					{(task) => (
						<ListItem>
							<ListLabel>{task.label}</ListLabel>
						</ListItem>
					)}
				</List>
			</Sizer>
		</Example>
	)
}

function Disabled() {
	const [tasks, setTasks] = useState(initialTasks)

	return (
		<Example title="Disabled">
			<Sizer>
				<List items={tasks} getKey={(t) => t.id} onReorder={setTasks} disabled>
					{(task) => (
						<ListItem>
							<ListHandle />
							<ListLabel>{task.label}</ListLabel>
						</ListItem>
					)}
				</List>
			</Sizer>
		</Example>
	)
}

export default function ListDemo() {
	return (
		<Stack gap={6}>
			<Vertical />
			<Horizontal />
			<ReadOnly />
			<Disabled />
		</Stack>
	)
}
