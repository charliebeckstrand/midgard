import { Calendar } from 'ui/calendar'

export default function MinAndMax() {
	return (
		<Calendar
			locale="en-US"
			defaultValue={new Date(2026, 5, 15)}
			min={new Date(2026, 5, 8)}
			max={new Date(2026, 5, 26)}
		/>
	)
}
