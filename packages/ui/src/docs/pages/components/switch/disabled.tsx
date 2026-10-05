import { Description, Label } from 'ui/fieldset'
import { Switch, SwitchField } from 'ui/switch'

export default function Disabled() {
	return (
		<SwitchField>
			<Switch disabled defaultChecked />
			<Label>Two-factor authentication</Label>
			<Description>Your organization requires two-factor authentication.</Description>
		</SwitchField>
	)
}
