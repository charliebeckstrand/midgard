import { useState } from 'react'
import { Field, Label } from '../../components/fieldset'
import { Listbox, ListboxLabel, ListboxOption } from '../../components/listbox'

export const meta = { category: 'Forms' }

const statuses = [
	{ value: 'active', label: 'Active' },
	{ value: 'paused', label: 'Paused' },
	{ value: 'delayed', label: 'Delayed' },
	{ value: 'canceled', label: 'Canceled' },
]

export default function ListboxDemo() {
	const [selected, setSelected] = useState(statuses[0].value)

	return (
		<Field className="max-w-sm">
			<Label>Status</Label>
			<Listbox value={selected} onChange={setSelected} placeholder="Select status…">
				{statuses.map((status) => (
					<ListboxOption key={status.value} value={status.value}>
						<ListboxLabel>{status.label}</ListboxLabel>
					</ListboxOption>
				))}
			</Listbox>
		</Field>
	)
}
