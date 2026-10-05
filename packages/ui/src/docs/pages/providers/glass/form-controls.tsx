import { useState } from 'react'
import { Combobox, ComboboxLabel, ComboboxOption, useComboboxDeferredQuery } from 'ui/combobox'
import { DatePicker } from 'ui/date-picker'
import { Field, Label } from 'ui/fieldset'
import { NumberInput } from 'ui/number-input'
import { GlassProvider } from 'ui/providers/glass'
import { Select, SelectLabel, SelectOption } from 'ui/select'
import { Stack } from 'ui/stack'

const people = ['Wade Cooper', 'Arlene McCoy', 'Devon Webb', 'Tom Cook']

function FilteredPeople() {
	const deferredQuery = useComboboxDeferredQuery()

	return people
		.filter((p) => !deferredQuery || p.toLowerCase().includes(deferredQuery.toLowerCase()))
		.map((p) => (
			<ComboboxOption key={p} value={p}>
				<ComboboxLabel>{p}</ComboboxLabel>
			</ComboboxOption>
		))
}

export default function FormControls() {
	const [person, setPerson] = useState<string | null>(null)

	const [date, setDate] = useState<Date | null>(null)

	return (
		<Stack gap="md">
			<GlassProvider>
				<Field>
					<Label>Select</Label>
					<Select placeholder="Select a person" displayValue={(v: string) => v}>
						{people.map((p) => (
							<SelectOption key={p} value={p}>
								<SelectLabel>{p}</SelectLabel>
							</SelectOption>
						))}
					</Select>
				</Field>
				<Field>
					<Label>Combobox</Label>
					<Combobox
						value={person}
						onValueChange={setPerson}
						displayValue={(v: string) => v}
						placeholder="Search people"
					>
						<FilteredPeople />
					</Combobox>
				</Field>
				<Field>
					<Label>Date</Label>
					<DatePicker value={date} onValueChange={setDate} />
				</Field>
				<Field>
					<Label>Number</Label>
					<NumberInput defaultValue={1} />
				</Field>
			</GlassProvider>
		</Stack>
	)
}
