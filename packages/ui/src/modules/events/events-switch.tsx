'use client'

import { Label } from '../../components/fieldset'
import { Switch, SwitchField } from '../../components/switch'
import { useIntl } from '../../primitives/intl/use-intl'
import { isEventsOn, setEventsOn } from './engine/events-setting'
import { eventsMessages } from './events-messages'

/**
 * The Debug switch of the events, for the settings of the app, such as the
 * fields of `AppearanceSettings`. It turns the events on and off on this
 * device. While they are on, `EventsButton` shows in the header.
 *
 * @remarks
 * The switch holds its own checked state, and it starts from the setting when
 * it mounts. It reads the setting in its render, so render it on the client
 * only, as `AppearanceSettings` does with its fields.
 */
export function EventsSwitch() {
	const intl = useIntl()

	return (
		<SwitchField>
			<Label>{intl.formatMessage(eventsMessages.debug)}</Label>
			<Switch
				defaultChecked={isEventsOn()}
				onChange={(event) => setEventsOn(event.target.checked)}
			/>
		</SwitchField>
	)
}
