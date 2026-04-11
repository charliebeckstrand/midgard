import { Description, Label } from '../../components/fieldset'
import { Switch, SwitchField } from '../../components/switch'
import { Example } from '../components/example'

export const meta = { category: 'Forms' }

export default function SwitchDemo() {
	return (
		<Example>
			<div className="space-y-6">
				<SwitchField>
					<Label htmlFor="switch-notifications">Notifications</Label>
					<Description>Receive email notifications for new activity.</Description>
					<Switch id="switch-notifications" />
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
			</div>
		</Example>
	)
}
