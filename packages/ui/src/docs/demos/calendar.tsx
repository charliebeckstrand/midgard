import { useState } from 'react'
import { Calendar } from '../../components/calendar'
import { Example } from '../engine'

export function Demo() {
	const [date, setDate] = useState<Date | undefined>(undefined)

	const min = new Date()

	min.setDate(min.getDate() - 30)

	const max = new Date()

	max.setDate(max.getDate() + 30)

	return (
		<>
			<Example title="Default">
				<Calendar value={date} onValueChange={setDate} />
			</Example>

			<Example title="With min/max">
				<Calendar min={min} max={max} />
			</Example>
		</>
	)
}
