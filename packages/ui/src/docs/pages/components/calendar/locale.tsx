import { Calendar } from 'ui/calendar'

export default function Locale() {
	// The calendar writes its names in German, so a screen reader reads them in German.
	return (
		<div lang="de-DE">
			<Calendar locale="de-DE" defaultValue={new Date(2026, 5, 15)} />
		</div>
	)
}
