import { useState } from 'react'
import { Calendar } from '../../components/calendar'
import { Example } from '../example'

export const meta = { category: 'Forms' }

export default function CalendarDemo() {
	const [date, setDate] = useState<Date | undefined>(undefined)

	const min = new Date()

	min.setDate(min.getDate() - 30)

	const max = new Date()

	max.setDate(max.getDate() + 30)

	return (
		<div className="space-y-8">
			<Example title="Basic">
				<Calendar value={date} onChange={setDate} />
			</Example>

			<Example title="With min/max">
				<Calendar min={min} max={max} />
			</Example>
		</div>
	)
}
