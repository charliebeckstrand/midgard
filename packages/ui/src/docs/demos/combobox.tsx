'use client'

import { useState } from 'react'
import { Combobox, ComboboxLabel, ComboboxOption } from '../../components/combobox'
import { Field, Label } from '../../components/fieldset'
import { Stack } from '../../components/stack'
import { Example } from '../components/example'

export const meta = { category: 'Forms' }

const people = [
	'Wade Cooper',
	'Arlene McCoy',
	'Devon Webb',
	'Tom Cook',
	'Tanya Fox',
	'Hellen Schmidt',
]

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
		<Stack gap="xl">
			<Example title="Single">
				<SingleComboboxExample />
			</Example>
			<Example title="Multiple">
				<MultiComboboxExample />
			</Example>
		</Stack>
	)
}
