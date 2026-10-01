import { useState } from 'react'
import { Field, Label } from '../../../components/fieldset'
import { Listbox, ListboxLabel, ListboxOption } from '../../../components/listbox'
import { Axes, Example } from '../../engine'

// The selected value starts in lower case and is long, so the `capitalize` and
// `truncate` axes show a change.
const stages = ['awaiting approval from finance', 'in review', 'shipped']

const statuses = [
	{ value: 'active', label: 'Active' },
	{ value: 'paused', label: 'Paused' },
	{ value: 'delayed', label: 'Delayed' },
	{ value: 'canceled', label: 'Canceled' },
]

function SingleListboxExample() {
	const [selected, setSelected] = useState<string | null>(null)

	return (
		<Field>
			<Label>Status</Label>
			<Listbox<string>
				nullable
				value={selected}
				onValueChange={setSelected}
				displayValue={(v: string) => statuses.find((s) => s.value === v)?.label ?? v}
				placeholder="Select status"
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

function MultiListboxExample() {
	const [selected, setSelected] = useState<string[]>([])

	return (
		<Field>
			<Label>Statuses</Label>
			<Listbox<string>
				multiple
				value={selected}
				onValueChange={setSelected}
				displayValue={(v) => statuses.find((s) => s.value === v)?.label ?? v}
				placeholder="Select statuses"
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

export function Demo() {
	return (
		<>
			<Axes
				of="Listbox"
				omit={['placement', 'open', 'multiple', 'required', 'nullable']}
				render={(props, label) => (
					<div className="w-48">
						<Listbox
							{...props}
							aria-label={label}
							defaultValue={stages[0]}
							displayValue={(v: string) => v}
						>
							{stages.map((stage) => (
								<ListboxOption key={stage} value={stage}>
									<ListboxLabel>{stage}</ListboxLabel>
								</ListboxOption>
							))}
						</Listbox>
					</div>
				)}
			/>

			<Example title="Single">
				<SingleListboxExample />
			</Example>

			<Example title="Multiple">
				<MultiListboxExample />
			</Example>
		</>
	)
}
