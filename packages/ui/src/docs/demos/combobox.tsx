import { useState } from 'react'
import { Combobox, ComboboxLabel, ComboboxOption } from '../../components/combobox'
import { Field, Label } from '../../components/fieldset'
import { code } from '../code'
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

function SingleCombobox() {
	const [selected, setSelected] = useState<string | undefined>(undefined)

	return (
		<Field className="lg:max-w-sm">
			<Label>Assignee</Label>
			<Combobox
				value={selected}
				onChange={setSelected}
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

function MultiCombobox() {
	const [selected, setSelected] = useState<string[]>([])

	return (
		<Field className="lg:max-w-sm">
			<Label>Assignees</Label>
			<Combobox
				multiple
				value={selected}
				onChange={setSelected}
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
		<div className="space-y-8">
			<Example
				title="Single"
				code={code`
					import { Combobox, ComboboxLabel, ComboboxOption } from 'ui/combobox'
					import { Field, Label } from 'ui/fieldset'

					const people = [
					${people.map((p) => `  '${p}',`)}
					]

					<Field>
						<Label>Assignee</Label>
						<Combobox value={value} onChange={setValue} placeholder="Select a person">
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
				`}
			>
				<SingleCombobox />
			</Example>
			<Example
				title="Multiple"
				code={code`
					import { Combobox, ComboboxLabel, ComboboxOption } from 'ui/combobox'
					import { Field, Label } from 'ui/fieldset'

					const people = [
					${people.map((p) => `  '${p}',`)}
					]

					<Field>
						<Label>Assignees</Label>
						<Combobox multiple value={values} onChange={setValues} placeholder="Select people">
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
				`}
			>
				<MultiCombobox />
			</Example>
		</div>
	)
}
