import { useState } from 'react'
import { Calendar } from 'ui/calendar'
import { DateTime } from 'ui/date-time'
import { Text } from 'ui/text'

export default function Controlled() {
	const [date, setDate] = useState<Date | null>(new Date(2026, 5, 15))

	return (
		<>
			<Calendar value={date} onValueChange={setDate} />
			<Text>
				Value: {date ? <DateTime value={date} format={{ dateStyle: 'long' }} /> : 'Empty'}
			</Text>
		</>
	)
}
