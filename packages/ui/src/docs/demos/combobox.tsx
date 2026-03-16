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
	const [selected, setSelected] = useState<string | null>(null)

	return (
		<Field className="max-w-sm">
			<Label htmlFor="combobox-assignee">Assignee</Label>
			<Combobox
				inputId="combobox-assignee"
				value={selected}
				onChange={setSelected}
				options={people}
				displayValue={(v) => v ?? ''}
				placeholder="Select a person…"
			>
				{(person) => (
					<ComboboxOption value={person}>
						<ComboboxLabel>{person}</ComboboxLabel>
					</ComboboxOption>
				)}
			</Combobox>
		</Field>
	)
}
