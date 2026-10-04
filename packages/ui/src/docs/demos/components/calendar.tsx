import { useState } from 'react'
import { Calendar } from '../../../components/calendar'
import { Text } from '../../../components/text'
import { Axes, Example } from '../../engine'

function ControlledExample() {
	const [date, setDate] = useState<Date | null>(null)

	return (
		<Example title="Controlled">
			<Calendar value={date} onValueChange={setDate} />
			<Text className="tabular-nums">{date ? date.toDateString() : 'Empty'}</Text>
		</Example>
	)
}

export default function Demo() {
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
			<Axes of="Calendar" omit={['multiselectable']} render={(props) => <Calendar {...props} />} />

			<ControlledExample />

			<Example title="With min/max">
				<Calendar min={min} max={max} />
			</Example>
		</>
	)
}
