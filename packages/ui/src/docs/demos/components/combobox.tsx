import { useMemo, useState } from 'react'
import {
	Combobox,
	ComboboxCreateOption,
	ComboboxLabel,
	ComboboxOption,
	useComboboxDeferredQuery,
} from '../../../components/combobox'
import { Field, Label } from '../../../components/fieldset'
import { VirtualOptions } from '../../../primitives/virtual-options'
import { Axes, Example } from '../../engine'

// The selected value starts in lower case and is long, so the `capitalize` axis
// shows a change.
const stages = ['awaiting approval from finance', 'in review', 'shipped']

const people = [
	'Wade Cooper',
	'Arlene McCoy',
	'Devon Webb',
	'Tom Cook',
	'Tanya Fox',
	'Hellen Schmidt',
]

function FilteredPeople({ options = people }: { options?: string[] }) {
	const deferredQuery = useComboboxDeferredQuery()

	return options
		.filter((p) => !deferredQuery || p.toLowerCase().includes(deferredQuery.toLowerCase()))
		.map((person) => (
			<ComboboxOption key={person} value={person}>
				<ComboboxLabel>{person}</ComboboxLabel>
			</ComboboxOption>
		))
}

function SingleComboboxExample() {
	const [selected, setSelected] = useState<string | null>(null)

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

function CreatableExample() {
	const [options, setOptions] = useState(people)
	const [selected, setSelected] = useState<string | null>(null)

	// The create row selects the name but does not change the list. This handler adds
	// a new name to the list, so the name is an option when the panel opens again.
	const select = (name: string | null) => {
		setSelected(name)

		if (name) setOptions((current) => (current.includes(name) ? current : [...current, name]))
	}

	return (
		<Field>
			<Label>Assignee</Label>
			<Combobox
				value={selected}
				onValueChange={select}
				displayValue={(v: string) => v}
				placeholder="Choose or name someone"
			>
				<FilteredPeople options={options} />
				{/* Last, after the matches: they answer the query first, and creating is
				    what is left when none of them do. `taken` withdraws the row for a name
				    the list already holds. */}
				<ComboboxCreateOption taken={options} />
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
	const deferredQuery = useComboboxDeferredQuery()

	const filtered = useMemo(
		() =>
			deferredQuery
				? manyPeople.filter((p) => p.label.toLowerCase().includes(deferredQuery.toLowerCase()))
				: manyPeople,
		[deferredQuery],
	)

	return (
		<VirtualOptions items={filtered} getOptionId={(person) => `virtual-person-${person.id}`}>
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
	const [selected, setSelected] = useState<number | null>(null)

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
			<Axes
				of="Combobox"
				omit={[
					'placement',
					'open',
					'multiple',
					'required',
					'nullable',
					'closeOnSelect',
					'clearOnEmpty',
				]}
				render={(props, label) => (
					<Combobox
						{...props}
						aria-label={label}
						defaultValue={stages[0]}
						displayValue={(v: string) => v}
					>
						{stages.map((stage) => (
							<ComboboxOption key={stage} value={stage}>
								<ComboboxLabel>{stage}</ComboboxLabel>
							</ComboboxOption>
						))}
					</Combobox>
				)}
			/>

			<Example title="Single">
				<SingleComboboxExample />
			</Example>
			<Example title="Multiple">
				<MultiComboboxExample />
			</Example>
			<Example title="Creatable">
				<CreatableExample />
			</Example>
			<Example title="Virtualized">
				<VirtualizedComboboxExample />
			</Example>
		</>
	)
}
