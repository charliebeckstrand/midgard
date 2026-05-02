'use client'

import { useState } from 'react'
import { List, ListDescription, ListItem, ListLabel } from '../../components/list'
import { Stack } from '../../components/stack'
import { Example } from '../components/example'
import { VariantListbox } from '../components/variant-listbox'

export const meta = { category: 'Data Display' }

const variants = ['separated', 'outline', 'plain', 'solid'] as const

type Task = { id: string; label: string; description?: string }

const initialTasks: Task[] = [
	{ id: 'a', label: 'Design the sortable hook API' },
	{ id: 'b', label: 'Write pointer-event reordering logic' },
	{ id: 'c', label: 'Add keyboard a11y (Space to grab, arrows to move)' },
	{ id: 'd', label: 'Ship docs and tests' },
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

function Default() {
	const [variant, setVariant] = useState<(typeof variants)[number]>('separated')

	return (
		<Example
			title="Default"
			actions={<VariantListbox variants={variants} value={variant} onChange={setVariant} />}
		>
			<Stack gap="sm">
				<List variant={variant} sortable={false} items={initialTasks} aria-label="Tasks">
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

function Vertical() {
	const [tasks, setTasks] = useState(initialTasks)

	return (
		<Example title="Sortable">
			<Stack gap="sm">
				<List items={tasks} getKey={(t) => t.id} onReorder={setTasks} aria-label="Tasks">
					{(task) => (
						<ListItem>
							<ListLabel>{task.label}</ListLabel>
							<ListDescription>{task.description}</ListDescription>
						</ListItem>
					)}
				</List>
			</Stack>
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

function ReadOnly() {
	return (
		<Example title="Read-only">
			<List items={initialTasks} getKey={(t) => t.id}>
				{(task) => (
					<ListItem>
						<ListLabel>{task.label}</ListLabel>
					</ListItem>
				)}
			</List>
		</Example>
	)
}

function WithDescriptions() {
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

function Disabled() {
	const [tasks, setTasks] = useState(initialTasks)

	return (
		<Example title="Disabled">
			<List items={tasks} getKey={(t) => t.id} onReorder={setTasks} disabled>
				{(task) => (
					<ListItem>
						<ListLabel>{task.label}</ListLabel>
					</ListItem>
				)}
			</List>
		</Example>
	)
}

export default function ListDemo() {
	return (
		<Stack gap="xl">
			<Default />
			<Vertical />
			<Horizontal />
			<WithDescriptions />
			<ReadOnly />
			<Disabled />
		</Stack>
	)
}
