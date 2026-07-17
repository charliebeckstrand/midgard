import { useState } from 'react'
import { Calendar } from '../../../components/calendar'
import { Example } from '../../engine'

export function Demo() {
	const [date, setDate] = useState<Date | undefined>(undefined)

	// Freeze the ±30-day window at mount so it doesn't recompute on every render
	// (including on each selection) — mirrors the demos' `useNow` freeze pattern.
	const [{ min, max }] = useState(() => {
		const start = new Date()

		start.setDate(start.getDate() - 30)

		const end = new Date()

		end.setDate(end.getDate() + 30)

		return { min: start, max: end }
	})

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
