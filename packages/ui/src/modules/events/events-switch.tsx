'use client'

import { useState } from 'react'
import { Label } from '../../components/fieldset'
import { Switch, SwitchField } from '../../components/switch'
import { isEventsOn, setEventsOn } from './engine/events-setting'

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

	return (
		<SwitchField>
			<Label>Debug</Label>
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
