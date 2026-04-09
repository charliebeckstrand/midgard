import { useState } from 'react'
import { Calendar } from '../../components/calendar'
import { Text } from '../../components/text'
import { code } from '../code'
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
			<Example
				title="Basic"
				code={code`
					import { Calendar } from 'ui/calendar'

					const [date, setDate] = useState<Date>()

					<Calendar value={date} onChange={setDate} />
				`}
			>
				<div className="space-y-2">
					<Calendar value={date} onChange={setDate} />
					<Text>{date ? `Selected: ${date.toLocaleDateString()}` : 'No date selected'}</Text>
				</div>
			</Example>

			<Example
				title="With min/max"
				code={code`
					import { Calendar } from 'ui/calendar'

					<Calendar min={minDate} max={maxDate} />
				`}
			>
				<Calendar min={min} max={max} />
			</Example>
		</div>
	)
}
