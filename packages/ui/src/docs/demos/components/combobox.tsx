import { useMemo, useState } from 'react'
import {
	Combobox,
	ComboboxLabel,
	ComboboxOption,
	useComboboxQuery,
} from '../../../components/combobox'
import { Field, Label } from '../../../components/fieldset'
import { VirtualOptions } from '../../../primitives/virtual-options'
import { Example } from '../../engine'

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

function ClearableExample() {
	const [selected, setSelected] = useState<string | undefined>('Tom Cook')

	return (
		<Field>
			<Label>Assignee</Label>
			<Combobox
				value={selected}
				onValueChange={setSelected}
				displayValue={(v: string) => v}
				placeholder="Select a person"
				clearable
			>
				<FilteredPeople />
			</Combobox>
		</Field>
	)
}

// 5,000 options — the DOM-query roving `useA11yRoving` falls back to would
// never reach most of these; `VirtualOptions` with `getOptionId` registers a
// keyboard-navigable index-based source instead, so arrow keys still traverse
// the full list.
const manyPeople = Array.from({ length: 5_000 }, (_, i) => ({ id: i, label: `Person ${i + 1}` }))

function VirtualizedPeople() {
	const { deferredQuery } = useComboboxQuery()

	const filtered = useMemo(
		() =>
			deferredQuery
				? manyPeople.filter((p) => p.label.toLowerCase().includes(deferredQuery.toLowerCase()))
				: manyPeople,
		[deferredQuery],
	)

	return (
		<VirtualOptions
			items={filtered}
			estimateSize={36}
			getOptionId={(person) => `virtual-person-${person.id}`}
		>
			{(person, _index, meta) => (
				<ComboboxOption
					key={person.id}
					id={`virtual-person-${person.id}`}
					value={person.id}
					{...meta}
				>
					<ComboboxLabel>{person.label}</ComboboxLabel>
				</ComboboxOption>
			)}
		</VirtualOptions>
	)
}

function VirtualizedComboboxExample() {
	const [selected, setSelected] = useState<number | undefined>(undefined)

	return (
		<Field>
			<Label>Assignee</Label>
			<Combobox
				nullable
				value={selected}
				onValueChange={setSelected}
				displayValue={(id: number) => manyPeople.find((p) => p.id === id)?.label ?? ''}
				placeholder="Search 5,000 people"
			>
				<VirtualizedPeople />
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
			<Example title="Clearable">
				<ClearableExample />
			</Example>
			<Example title="Virtualized">
				<VirtualizedComboboxExample />
			</Example>
		</>
	)
}
