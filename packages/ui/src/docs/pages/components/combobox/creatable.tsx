import { useState } from 'react'
import {
	Combobox,
	ComboboxCreateOption,
	ComboboxLabel,
	ComboboxOption,
	useComboboxDeferredQuery,
} from 'ui/combobox'
import { Field, Label } from 'ui/fieldset'
import { people } from './people.ts'

function MatchingPeople({ options }: { options: string[] }) {
	const query = useComboboxDeferredQuery().toLowerCase()

	return options
		.filter((person) => person.toLowerCase().includes(query))
		.map((person) => (
			<ComboboxOption key={person} value={person}>
				<ComboboxLabel>{person}</ComboboxLabel>
			</ComboboxOption>
		))
}

export default function Creatable() {
	const [options, setOptions] = useState(people)

	const [assignee, setAssignee] = useState<string | null>(null)

	function select(person: string | null) {
		setAssignee(person)

		if (person && !options.includes(person)) setOptions([...options, person])
	}

	return (
		<Field>
			<Label>Assignee</Label>
			<Combobox
				placeholder="Search or add a person"
				value={assignee}
				onValueChange={select}
				displayValue={(person) => person}
			>
				<MatchingPeople options={options} />
				<ComboboxCreateOption taken={options} />
			</Combobox>
		</Field>
	)
}
