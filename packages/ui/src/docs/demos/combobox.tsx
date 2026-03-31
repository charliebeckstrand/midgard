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

export default function ComboboxDemo() {
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
