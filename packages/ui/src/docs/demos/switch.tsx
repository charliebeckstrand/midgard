import { useState } from 'react'
import { Description, Label } from '../../components/fieldset'
import { Switch, SwitchField, SwitchGroup } from '../../components/switch'

export const meta = { category: 'Forms' }

export default function SwitchDemo() {
	const [enabled, setEnabled] = useState(false)

	return (
		<SwitchGroup>
			<SwitchField>
				<Label>Notifications</Label>
				<Description>Receive email notifications for new activity.</Description>
				<Switch checked={enabled} onChange={setEnabled} />
			</SwitchField>
			<SwitchField>
				<Label>Dark mode</Label>
				<Description>Use the dark color scheme.</Description>
				<Switch defaultChecked color="blue" />
			</SwitchField>
			<SwitchField disabled>
				<Label>Disabled</Label>
				<Description>This switch is disabled.</Description>
				<Switch />
			</SwitchField>
		</SwitchGroup>
	)
}
