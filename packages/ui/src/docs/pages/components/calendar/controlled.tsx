import { useState } from 'react'
import { Calendar } from 'ui/calendar'
import { useIntl } from 'ui/primitives/intl'
import { Text } from 'ui/text'

export default function Controlled() {
	const intl = useIntl()

	const [date, setDate] = useState<Date | null>(new Date(2026, 5, 15))

	return (
		<>
			<Calendar locale="en-US" value={date} onValueChange={setDate} />
			<Text>Value: {date ? intl.formatDate(date, { dateStyle: 'long' }) : 'Empty'}</Text>
		</>
	)
}
