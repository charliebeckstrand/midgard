import { Calendar } from 'ui/calendar'

export default function Locale() {
	return <Calendar locale="de-DE" defaultValue={new Date(2026, 5, 15)} />
}
