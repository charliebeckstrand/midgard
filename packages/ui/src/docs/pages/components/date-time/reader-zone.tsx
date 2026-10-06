import { DateTime } from 'ui/date-time'

/**
 * The prerendered page shows the kickoff in UTC with the name of the zone.
 * After hydration, it shows the kickoff in the zone of the reader.
 */
export default function ReaderZone() {
	return (
		<DateTime
			value="2026-10-04T17:00:00Z"
			format={{ weekday: 'short', hour: 'numeric', minute: '2-digit' }}
		/>
	)
}
