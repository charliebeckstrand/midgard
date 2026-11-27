import {
	Combobox,
	ComboboxDescription,
	ComboboxLabel,
	ComboboxOption,
	ComboboxText,
	useComboboxDeferredQuery,
} from 'ui/combobox'
import { foldText } from 'ui/core'
import { Field, Label } from 'ui/fieldset'
import { profiles, roles } from '../../../data/people.ts'

const byName = profiles.toSorted((a, b) => a.name.localeCompare(b.name))

function MatchingPeople() {
	const query = foldText(useComboboxDeferredQuery())

	return byName
		.filter((person) => foldText(person.name).includes(query))
		.map((person) => (
			<ComboboxOption key={person.id} value={person.name}>
				<ComboboxText>
					<ComboboxLabel>{person.name}</ComboboxLabel>
					<ComboboxDescription>{roles[person.role]}</ComboboxDescription>
				</ComboboxText>
			</ComboboxOption>
		))
}

// `ComboboxText` stacks the label over the description.
export default function WithDescriptions() {
	return (
		<Field>
			<Label>Reviewer</Label>
			<Combobox placeholder="Search people" displayValue={(name: string) => name}>
				<MatchingPeople />
			</Combobox>
		</Field>
	)
}
