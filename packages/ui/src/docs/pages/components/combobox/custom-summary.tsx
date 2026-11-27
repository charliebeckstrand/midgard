import { Combobox, ComboboxLabel, ComboboxOption, useComboboxDeferredQuery } from 'ui/combobox'
import { foldText } from 'ui/core'
import { Field, Label } from 'ui/fieldset'
import { people } from './people.ts'

function MatchingPeople() {
	const query = foldText(useComboboxDeferredQuery())

	return people
		.filter((person) => foldText(person).includes(query))
		.map((person) => (
			<ComboboxOption key={person} value={person}>
				<ComboboxLabel>{person}</ComboboxLabel>
			</ComboboxOption>
		))
}

export default function CustomSummary() {
	return (
		<Field>
			<Label>Reviewers</Label>
			<Combobox
				multiple
				placeholder="Search people"
				defaultValue={['Devon Webb', 'Tanya Fox', 'Wade Cooper']}
				displayValue={(person) => person}
				summarize={(selected) => `${selected.length} reviewers`}
			>
				<MatchingPeople />
			</Combobox>
		</Field>
	)
}
