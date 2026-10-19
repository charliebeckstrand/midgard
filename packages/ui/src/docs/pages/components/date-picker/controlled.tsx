import { useState } from 'react'
import { DatePicker } from 'ui/date-picker'
import { Field, Label } from 'ui/fieldset'
import { useIntl } from 'ui/primitives/intl'
import { Text } from 'ui/text'

export default function Controlled() {
	const intl = useIntl()

	const [value, setValue] = useState<Date | null>(null)

	return (
		<>
			<Field>
				<Label>Due date</Label>
				<DatePicker value={value} onValueChange={setValue} />
			</Field>
			<Text>Value: {value ? intl.formatDate(value, { dateStyle: 'long' }) : 'Empty'}</Text>
		</>
	)
}
