import { useState } from 'react'
import { Label } from 'ui/fieldset'
import { Switch, SwitchField } from 'ui/switch'
import { Text } from 'ui/text'

export default function Controlled() {
	const [enabled, setEnabled] = useState(true)

	return (
		<>
			<SwitchField>
				<Switch checked={enabled} onChange={(event) => setEnabled(event.target.checked)} />
				<Label>Save drafts automatically</Label>
			</SwitchField>
			<Text>Value: {enabled ? 'On' : 'Off'}</Text>
		</>
	)
}
