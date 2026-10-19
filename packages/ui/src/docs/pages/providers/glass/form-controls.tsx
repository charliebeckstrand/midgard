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
	const query = useComboboxDeferredQuery()

	return people
		.filter((name) => !query || name.toLowerCase().includes(query.toLowerCase()))
		.map((name) => (
			<ComboboxOption key={name} value={name}>
				<ComboboxLabel>{name}</ComboboxLabel>
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
					<Label>Owner</Label>
					<Select placeholder="Select a person" displayValue={(value: string) => value}>
						{people.map((name) => (
							<SelectOption key={name} value={name}>
								<SelectLabel>{name}</SelectLabel>
							</SelectOption>
						))}
					</Select>
				</Field>
				<Field>
					<Label>Reviewer</Label>
					<Combobox
						value={person}
						onValueChange={setPerson}
						displayValue={(value: string) => value}
						placeholder="Search people"
					>
						<FilteredPeople />
					</Combobox>
				</Field>
				<Field>
					<Label>Due date</Label>
					<DatePicker value={date} onValueChange={setDate} />
				</Field>
				<Field>
					<Label>Estimate (days)</Label>
					<NumberInput defaultValue={1} />
				</Field>
			</GlassProvider>
		</Stack>
	)
}
