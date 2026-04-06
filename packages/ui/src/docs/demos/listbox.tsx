import { useState } from 'react'
import { Field, Label } from '../../components/fieldset'
import { Listbox, ListboxLabel, ListboxOption } from '../../components/listbox'
import { Example } from '../example'

export const meta = { category: 'Forms' }

const statuses = [
	{ value: 'active', label: 'Active' },
	{ value: 'paused', label: 'Paused' },
	{ value: 'delayed', label: 'Delayed' },
	{ value: 'canceled', label: 'Canceled' },
]

const statusesCode = `const statuses = [\n${statuses.map((s) => `  { value: '${s.value}', label: '${s.label}' },`).join('\n')}\n]`

function SingleListbox() {
	const [selected, setSelected] = useState(statuses[0].value)

	return (
		<Field className="max-w-sm">
			<Label>Status</Label>
			<Listbox
				value={selected}
				onChange={setSelected}
				displayValue={(v: string) => statuses.find((s) => s.value === v)?.label ?? v}
				placeholder="Select status…"
			>
				{statuses.map((status) => (
					<ListboxOption key={status.value} value={status.value}>
						<ListboxLabel>{status.label}</ListboxLabel>
					</ListboxOption>
				))}
			</Listbox>
		</Field>
	)
}

function MultiListbox() {
	const [selected, setSelected] = useState<string[]>([])

	return (
		<Field className="max-w-sm">
			<Label>Statuses</Label>
			<Listbox
				multiple
				value={selected}
				onChange={setSelected}
				displayValue={(v: string) => statuses.find((s) => s.value === v)?.label ?? v}
				placeholder="Select statuses…"
			>
				{statuses.map((status) => (
					<ListboxOption key={status.value} value={status.value}>
						<ListboxLabel>{status.label}</ListboxLabel>
					</ListboxOption>
				))}
			</Listbox>
		</Field>
	)
}

export default function ListboxDemo() {
	return (
		<div className="space-y-8">
			<Example
				title="Single"
				code={`import { Field, Label } from 'ui/fieldset'
import { Listbox, ListboxLabel, ListboxOption } from 'ui/listbox'

${statusesCode}

<Field>
  <Label>Status</Label>
  <Listbox value={value} onChange={setValue} placeholder="Select status…">
    {statuses.map((status) => (
      <ListboxOption key={status.value} value={status.value}>
        <ListboxLabel>{status.label}</ListboxLabel>
      </ListboxOption>
    ))}
  </Listbox>
</Field>`}
			>
				<SingleListbox />
			</Example>
			<Example
				title="Multiple"
				code={`import { Field, Label } from 'ui/fieldset'
import { Listbox, ListboxLabel, ListboxOption } from 'ui/listbox'

${statusesCode}

<Field>
  <Label>Statuses</Label>
  <Listbox multiple value={values} onChange={setValues} placeholder="Select statuses…">
    {statuses.map((status) => (
      <ListboxOption key={status.value} value={status.value}>
        <ListboxLabel>{status.label}</ListboxLabel>
      </ListboxOption>
    ))}
  </Listbox>
</Field>`}
			>
				<MultiListbox />
			</Example>
		</div>
	)
}
