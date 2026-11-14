import { Calendar } from 'ui/calendar'

function isWeekend(date: Date) {
	return date.getDay() === 0 || date.getDay() === 6
}

export default function DisabledDays() {
	return <Calendar defaultValue={new Date(2026, 5, 15)} isDayDisabled={isWeekend} />
}
