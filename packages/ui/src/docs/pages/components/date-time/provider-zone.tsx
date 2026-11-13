import { DateTime } from 'ui/date-time'
import { LocaleProvider } from 'ui/providers/locale'

/**
 * The provider sets the zone of each date in it. An app that shows the times
 * of one place, such as a league schedule, sets the zone of that place. The
 * prerendered page still shows a skeleton, because the browser writes the
 * text after hydration.
 */
export default function ProviderZone() {
	return (
		<LocaleProvider timeZone="America/New_York">
			<DateTime
				value="2026-10-04T17:00:00Z"
				format={{ weekday: 'short', hour: 'numeric', minute: '2-digit', timeZoneName: 'short' }}
			/>
		</LocaleProvider>
	)
}
