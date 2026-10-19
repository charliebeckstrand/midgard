import { Combobox, ComboboxLabel, ComboboxOption, useComboboxDeferredQuery } from 'ui/combobox'
import { Field, Label } from 'ui/fieldset'
import { VirtualOptions } from 'ui/primitives/virtual-options'

const tasks = Array.from(
	{ length: 5000 },
	(_, index) => `TASK-${String(index + 1).padStart(4, '0')}`,
)

function MatchingTasks() {
	const query = useComboboxDeferredQuery().toLowerCase()

	const matches = tasks.filter((task) => task.toLowerCase().includes(query))

	return (
		<VirtualOptions items={matches} getOptionId={(task) => `task-${task}`}>
			{(task, _index, meta) => (
				<ComboboxOption key={task} id={`task-${task}`} value={task} {...meta}>
					<ComboboxLabel>{task}</ComboboxLabel>
				</ComboboxOption>
			)}
		</VirtualOptions>
	)
}

export default function Virtualized() {
	return (
		<Field>
			<Label>Task</Label>
			<Combobox placeholder="Search 5,000 tasks" displayValue={(task: string) => task}>
				<MatchingTasks />
			</Combobox>
		</Field>
	)
}
