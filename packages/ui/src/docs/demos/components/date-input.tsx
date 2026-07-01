import { useState } from 'react'
import { DateInput } from '../../../components/date-input'
import { Field, Label } from '../../../components/fieldset'
import { Example } from '../../engine'

function ControlledExample() {
	const [value, setValue] = useState<Date | undefined>(new Date(2026, 5, 15))

	return (
		<Example title="Controlled">
			<Field>
				<Label>Ship date</Label>
				<DateInput value={value} onValueChange={setValue} />
			</Field>
		</Example>
	)
}

export function Demo() {
	return (
		<>
			<Example title="Default">
				<Field>
					<Label>Due date</Label>
					<DateInput />
				</Field>
			</Example>

			<Example title="Formats">
				<Field>
					<Label>Departure</Label>
					<DateInput format="DD/MM/YYYY" />
				</Field>
				<Field>
					<Label>Published</Label>
					<DateInput format="YYYY-MM-DD" />
				</Field>
			</Example>

			<Example title="Min and max">
				<Field>
					<Label>Delivery in 2026</Label>
					<DateInput min={new Date(2026, 0, 1)} max={new Date(2026, 11, 31)} />
				</Field>
			</Example>

			<Example title="Validation">
				<Field>
					<Label>Due date</Label>
					<DateInput invalidMessage="Enter the date as MM/DD/YYYY." />
				</Field>
			</Example>

			<ControlledExample />

			<Example title="Disabled">
				<Field>
					<Label>Disabled</Label>
					<DateInput disabled defaultValue={new Date(2026, 5, 15)} />
				</Field>
			</Example>
		</>
	)
}
