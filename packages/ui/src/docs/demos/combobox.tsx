import { useState } from 'react'
import {
	Combobox,
	ComboboxLabel,
	ComboboxOption,
	useComboboxQuery,
} from '../../components/combobox'
import { Field, Label } from '../../components/fieldset'
import { Example } from '../components/example'

const people = [
	'Wade Cooper',
	'Arlene McCoy',
	'Devon Webb',
	'Tom Cook',
	'Tanya Fox',
	'Hellen Schmidt',
]

function FilteredPeople() {
	const { deferredQuery } = useComboboxQuery()

	return people
		.filter((p) => !deferredQuery || p.toLowerCase().includes(deferredQuery.toLowerCase()))
		.map((person) => (
			<ComboboxOption key={person} value={person}>
				<ComboboxLabel>{person}</ComboboxLabel>
			</ComboboxOption>
		))
}

function SingleComboboxExample() {
	const [selected, setSelected] = useState<string | undefined>(undefined)

	return (
		<Field>
			<Label>Assignee</Label>
			<Combobox
				nullable
				value={selected}
				onValueChange={setSelected}
				displayValue={(v: string) => v}
				placeholder="Select a person"
			>
				<FilteredPeople />
			</Combobox>
		</Field>
	)
}

function MultiComboboxExample() {
	const [selected, setSelected] = useState<string[]>([])

	return (
		<Field>
			<Label>Assignees</Label>
			<Combobox
				multiple
				value={selected}
				onValueChange={setSelected}
				displayValue={(v: string) => v}
				placeholder={selected.length ? `${selected.length} selected` : 'Select people'}
			>
				<FilteredPeople />
			</Combobox>
		</Field>
	)
}

export function Demo() {
	return (
		<>
			<Example title="Single">
				<SingleComboboxExample />
			</Example>
			<Example title="Multiple">
				<MultiComboboxExample />
			</Example>
		</>
	)
}
