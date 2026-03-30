import { useState } from 'react'
import { Description, Label } from '../../components/fieldset'
import { Switch, SwitchField, SwitchGroup } from '../../components/switch'

export const meta = { category: 'Forms' }

export default function SwitchDemo() {
	const [enabled, setEnabled] = useState(false)

	return (
		<SwitchGroup>
			<SwitchField>
				<Label htmlFor="switch-notifications">Notifications</Label>
				<Description>Receive email notifications for new activity.</Description>
				<Switch id="switch-notifications" checked={enabled} onChange={setEnabled} />
			</SwitchField>
			<SwitchField>
				<Label htmlFor="switch-dark-mode">Dark mode</Label>
				<Description>Use the dark color scheme.</Description>
				<Switch id="switch-dark-mode" defaultChecked color="blue" />
			</SwitchField>
			<SwitchField>
				<Label htmlFor="switch-disabled">Disabled</Label>
				<Description>This switch is disabled.</Description>
				<Switch id="switch-disabled" disabled />
			</SwitchField>
		</SwitchGroup>
	)
}
