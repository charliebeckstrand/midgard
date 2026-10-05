import { useState } from 'react'
import { Calendar } from 'ui/calendar'
import { Text } from 'ui/text'

export default function Controlled() {
	const [date, setDate] = useState<Date | null>(new Date(2026, 5, 15))

	return (
		<>
			<Calendar locale="en-US" value={date} onValueChange={setDate} />
			<Text>Value: {date ? date.toDateString() : 'Empty'}</Text>
		</>
	)
}
