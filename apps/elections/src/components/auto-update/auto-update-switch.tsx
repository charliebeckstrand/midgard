'use client'

import { Description, Label } from 'ui/fieldset'
import { Switch, SwitchField } from 'ui/switch'
import { setAutoUpdate, useAutoUpdate } from '../../hooks/use-auto-update'

/**
 * The Auto update switch of the settings dialog. While it is on, the results
 * update each minute while votes are counted, and each changed number rolls
 * to its new value.
 */
export function AutoUpdateSwitch() {
	const on = useAutoUpdate()

	return (
		<SwitchField>
			<Switch checked={on} onChange={(event) => setAutoUpdate(event.target.checked)} />
			<Label>Auto update</Label>
			<Description>Update the results each minute while votes are counted.</Description>
		</SwitchField>
	)
}
