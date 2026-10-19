'use client'

import { useState } from 'react'
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
 * It reads the setting in its first render, so render it on the client only,
 * as `AppearanceSettings` does with its fields.
 */
export function EventsSwitch() {
	const [on, setOn] = useState(isEventsOn)

	const intl = useIntl()

	return (
		<SwitchField>
			<Label>{intl.formatMessage(eventsMessages.debug)}</Label>
			<Switch
				checked={on}
				onChange={(event) => {
					setEventsOn(event.target.checked)

					setOn(event.target.checked)
				}}
			/>
		</SwitchField>
	)
}
