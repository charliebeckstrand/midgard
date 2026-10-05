import { Description, Label } from 'ui/fieldset'
import { Switch, SwitchField } from 'ui/switch'

export default function WithDescription() {
	return (
		<SwitchField>
			<Switch />
			<Label>Email notifications</Label>
			<Description>Get an email when someone mentions you or replies to your comment.</Description>
		</SwitchField>
	)
}
