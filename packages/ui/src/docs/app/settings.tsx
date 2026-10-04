import { AppearanceSettings } from 'ui/providers/appearance'
import { EventLogSwitch } from '../debug/event-log/index.tsx'

/** The settings button of the header: the appearance of ui, and the Debug section with the Event log. */
export function Settings() {
	return (
		<AppearanceSettings>
			<EventLogSwitch />
		</AppearanceSettings>
	)
}
