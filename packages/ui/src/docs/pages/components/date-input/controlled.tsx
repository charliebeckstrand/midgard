import { useState } from 'react'
import { DateInput } from 'ui/date-input'
import { Field, Label } from 'ui/fieldset'
import { Text } from 'ui/text'

export default function Controlled() {
	const [value, setValue] = useState<Date | null>(new Date(2026, 5, 15))

	return (
		<>
			<Field>
				<Label>Ship date</Label>
				<DateInput format="MM/DD/YYYY" value={value} onValueChange={setValue} />
			</Field>
			<Text>Value: {value ? value.toDateString() : 'Empty'}</Text>
		</>
	)
}
