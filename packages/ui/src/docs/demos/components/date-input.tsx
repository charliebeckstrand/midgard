import { useState } from 'react'
import { DateInput } from '../../../components/date-input'
import { Field, Label } from '../../../components/fieldset'
import { Text } from '../../../components/text'
import { Axes, Example } from '../../engine'

export const meta = { category: 'input' }

function ControlledExample() {
	const [value, setValue] = useState<Date | null>(new Date(2026, 5, 15))

	return (
		<Example title="Controlled">
			<Field>
				<Label>Ship date</Label>
				<DateInput value={value} onValueChange={setValue} />
			</Field>
			<Text className="tabular-nums">{value ? value.toDateString() : 'Empty'}</Text>
		</Example>
	)
}

export function Demo() {
	return (
		<>
			<Axes of="DateInput" render={(props, label) => <DateInput {...props} aria-label={label} />} />

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
