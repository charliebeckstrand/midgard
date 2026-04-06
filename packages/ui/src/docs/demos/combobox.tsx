import { useState } from 'react'
import { Combobox, ComboboxLabel, ComboboxOption } from '../../components/combobox'
import { Field, Label } from '../../components/fieldset'
import { Example } from '../example'

export const meta = { category: 'Forms' }

const people = [
	'Wade Cooper',
	'Arlene McCoy',
	'Devon Webb',
	'Tom Cook',
	'Tanya Fox',
	'Hellen Schmidt',
]

const peopleCode = `import { Combobox, ComboboxLabel, ComboboxOption } from 'ui/combobox'\nimport { Field, Label } from 'ui/fieldset'\n\nconst people = [\n${people.map((p) => `  '${p}',`).join('\n')}\n]`

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
		<div className="space-y-8">
			<Example
				title="Single"
				code={`${peopleCode}

<Field>
  <Label>Assignee</Label>
  <Combobox value={value} onChange={setValue} placeholder="Select a person…">
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
</Field>`}
			>
				<SingleCombobox />
			</Example>
			<Example
				title="Multiple"
				code={`${peopleCode}

<Field>
  <Label>Assignees</Label>
  <Combobox multiple value={values} onChange={setValues} placeholder="Select people…">
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
</Field>`}
			>
				<MultiCombobox />
			</Example>
		</div>
	)
}
