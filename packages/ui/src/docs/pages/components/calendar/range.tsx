import { useState } from 'react'
import { CalendarRange } from 'ui/calendar'
import { Text } from 'ui/text'

export default function Range() {
	const [start, setStart] = useState<Date | null>(new Date(2026, 5, 8))

	const [end, setEnd] = useState<Date | null>(new Date(2026, 5, 12))

	const [hover, setHover] = useState<Date | null>(null)

	function pick(date: Date) {
		if (start === null || end !== null) {
			setStart(date)

			setEnd(null)
		} else if (date < start) {
			setStart(date)

			setEnd(start)
		} else {
			setEnd(date)
		}
	}

	return (
		<>
			<CalendarRange
				locale="en-US"
				rangeStart={start}
				rangeEnd={end}
				hoverDate={end === null ? hover : null}
				onHoverDate={setHover}
				onValueChange={pick}
			/>
			<Text>
				Value: {start && end ? `${start.toDateString()} to ${end.toDateString()}` : 'Empty'}
			</Text>
		</>
	)
}
