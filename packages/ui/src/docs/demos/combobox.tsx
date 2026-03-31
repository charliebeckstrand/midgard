import { useState } from 'react'
import { Combobox, ComboboxLabel, ComboboxOption } from '../../components/combobox'
import { Field, Label } from '../../components/fieldset'

export const meta = { category: 'Forms' }

const people = [
	'Wade Cooper',
	'Arlene McCoy',
	'Devon Webb',
	'Tom Cook',
	'Tanya Fox',
	'Hellen Schmidt',
]

function SingleCombobox() {
	const [selected, setSelected] = useState<string | undefined>(undefined)

	return (
		<Field className="max-w-sm">
			<Label>Assignee</Label>
			<Combobox
				value={selected}
				onChange={setSelected}
				displayValue={(v: string) => v}
				placeholder="Select a person…"
			>
				{(query) =>
					people
						.filter((p) => !query || p.toLowerCase().includes(query.toLowerCase()))
						.map((person) => (
							<ComboboxOption key={person} value={person}>
								<ComboboxLabel>{person}</ComboboxLabel>
							</ComboboxOption>
						))
				}
			</Combobox>
		</Field>
	)
}

function MultiCombobox() {
	const [selected, setSelected] = useState<string[]>([])

	return (
		<Field className="max-w-sm">
			<Label>Assignees</Label>
			<Combobox
				multiple
				value={selected}
				onChange={setSelected}
				displayValue={(v: string) => v}
				placeholder={selected.length ? `${selected.length} selected` : 'Select people…'}
			>
				{(query) =>
					people
						.filter((p) => !query || p.toLowerCase().includes(query.toLowerCase()))
						.map((person) => (
							<ComboboxOption key={person} value={person}>
								<ComboboxLabel>{person}</ComboboxLabel>
							</ComboboxOption>
						))
				}
			</Combobox>
		</Field>
	)
}

export default function ComboboxDemo() {
	return (
		<div className="space-y-6">
			<div className="space-y-3">
				<p className="text-sm font-medium text-zinc-500">Single</p>
				<SingleCombobox />
			</div>
			<div className="space-y-3">
				<p className="text-sm font-medium text-zinc-500">Multiple</p>
				<MultiCombobox />
			</div>
		</div>
	)
}
