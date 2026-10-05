import { Label } from 'ui/fieldset'
import { Switch, SwitchField, type SwitchProps } from 'ui/switch'

export default function SwitchPlayground(props: SwitchProps) {
	return (
		<SwitchField>
			<Switch defaultChecked {...props} />
			<Label>Email notifications</Label>
		</SwitchField>
	)
}
