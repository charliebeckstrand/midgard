import { Calendar, type CalendarProps } from 'ui/calendar'

export default function CalendarPlayground(props: CalendarProps) {
	return <Calendar locale="en-US" defaultValue={new Date(2026, 5, 15)} {...props} />
}
