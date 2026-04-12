import { useState } from 'react'
import { Field, Label } from '../../components/fieldset'
import { Glass } from '../../components/glass'
import { Listbox, ListboxLabel, ListboxOption } from '../../components/listbox'
import { Sizer } from '../../components/sizer'
import { code } from '../code'
import { Example } from '../components/example'

export const meta = { category: 'Forms' }

const statuses = [
	{ value: 'active', label: 'Active' },
	{ value: 'paused', label: 'Paused' },
	{ value: 'delayed', label: 'Delayed' },
	{ value: 'canceled', label: 'Canceled' },
]

function SingleListbox() {
	const [selected, setSelected] = useState<string | undefined>(undefined)

	return (
		<Sizer>
			<Field>
				<Label>Status</Label>
				<Listbox<string>
					value={selected}
					onChange={setSelected}
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
		</Sizer>
	)
}

function MultiListbox() {
	const [selected, setSelected] = useState<string[]>([])

	return (
		<Sizer>
			<Field>
				<Label>Statuses</Label>
				<Listbox<string>
					multiple
					value={selected}
					onChange={setSelected}
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
		</Sizer>
	)
}

export default function ListboxDemo() {
	return (
		<div className="space-y-8">
			<Example
				title="Single"
				code={code`
					import { Field, Label } from 'ui/fieldset'
					import { Listbox, ListboxLabel, ListboxOption } from 'ui/listbox'

					const statuses = [
					${statuses.map((s) => `  { value: '${s.value}', label: '${s.label}' },`)}
					]

					<Field>
						<Label>Status</Label>
						<Listbox value={value} onChange={setValue} placeholder="Select status">
							{statuses.map((status) => (
								<ListboxOption key={status.value} value={status.value}>
									<ListboxLabel>{status.label}</ListboxLabel>
								</ListboxOption>
							))}
						</Listbox>
					</Field>
				`}
			>
				<SingleListbox />
			</Example>
			<Example
				title="Multiple"
				code={code`
					import { Field, Label } from 'ui/fieldset'
					import { Listbox, ListboxLabel, ListboxOption } from 'ui/listbox'

					const statuses = [
					${statuses.map((s) => `  { value: '${s.value}', label: '${s.label}' },`)}
					]

					<Field>
						<Label>Statuses</Label>
						<Listbox multiple value={values} onChange={setValues} placeholder="Select statuses">
							{statuses.map((status) => (
								<ListboxOption key={status.value} value={status.value}>
									<ListboxLabel>{status.label}</ListboxLabel>
								</ListboxOption>
							))}
						</Listbox>
					</Field>
				`}
			>
				<MultiListbox />
			</Example>

			<Example title="Glass">
				<Glass>
					<Sizer>
						<Field>
							<Label>Status</Label>
							<Listbox<string>
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
					</Sizer>
				</Glass>
			</Example>
		</div>
	)
}
