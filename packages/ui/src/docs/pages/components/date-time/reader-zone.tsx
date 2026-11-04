import { DateTime } from 'ui/date-time'

/**
 * The prerendered page does not know the zone of the reader, so it shows a
 * skeleton line. After hydration, it shows the kickoff in the zone of the
 * reader.
 */
export default function ReaderZone() {
	return (
		<DateTime
			value="2026-10-04T17:00:00Z"
			format={{ weekday: 'short', hour: 'numeric', minute: '2-digit' }}
		/>
	)
}
