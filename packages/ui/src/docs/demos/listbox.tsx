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

function SingleListbox() {
	const [selected, setSelected] = useState(statuses[0].value)

	return (
		<Field className="max-w-sm">
			<Label>Status</Label>
			<Listbox
				value={selected}
				onChange={setSelected}
				displayValue={(v: string) => statuses.find((s) => s.value === v)?.label ?? v}
				placeholder="Select status…"
			>
				{statuses.map((status) => (
					<ListboxOption key={status.value} value={status.value}>
						<ListboxLabel>{status.label}</ListboxLabel>
					</ListboxOption>
				))}
			</Listbox>
		</Field>
	)
}

function MultiListbox() {
	const [selected, setSelected] = useState<string[]>([])

	return (
		<Field className="max-w-sm">
			<Label>Statuses</Label>
			<Listbox
				multiple
				value={selected}
				onChange={setSelected}
				displayValue={(v: string) => statuses.find((s) => s.value === v)?.label ?? v}
				placeholder="Select statuses…"
			>
				{statuses.map((status) => (
					<ListboxOption key={status.value} value={status.value}>
						<ListboxLabel>{status.label}</ListboxLabel>
					</ListboxOption>
				))}
			</Listbox>
		</Field>
	)
}

export default function ListboxDemo() {
	return (
		<div className="space-y-6">
			<div className="space-y-3">
				<p className="text-sm font-medium text-zinc-500">Single</p>
				<SingleListbox />
			</div>
			<div className="space-y-3">
				<p className="text-sm font-medium text-zinc-500">Multiple</p>
				<MultiListbox />
			</div>
		</div>
	)
}
