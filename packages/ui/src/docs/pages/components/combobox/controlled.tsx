import { useState } from 'react'
import { Combobox, ComboboxLabel, ComboboxOption, useComboboxDeferredQuery } from 'ui/combobox'
import { Field, Label } from 'ui/fieldset'
import { Text } from 'ui/text'
import { people } from './people.ts'

function MatchingPeople() {
	const query = useComboboxDeferredQuery().toLowerCase()

	return people
		.filter((person) => person.toLowerCase().includes(query))
		.map((person) => (
			<ComboboxOption key={person} value={person}>
				<ComboboxLabel>{person}</ComboboxLabel>
			</ComboboxOption>
		))
}

export default function Controlled() {
	const [assignee, setAssignee] = useState<string | null>(null)

	return (
		<>
			<Field>
				<Label>Assignee</Label>
				<Combobox
					placeholder="Search people"
					value={assignee}
					onValueChange={setAssignee}
					displayValue={(person) => person}
				>
					<MatchingPeople />
				</Combobox>
			</Field>
			<Text>Value: {assignee ?? 'Empty'}</Text>
		</>
	)
}
