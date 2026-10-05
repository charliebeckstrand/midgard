import { Checkbox, CheckboxField } from 'ui/checkbox'
import { Description, Label } from 'ui/fieldset'

export default function WithDescription() {
	return (
		<CheckboxField>
			<Checkbox />
			<Label>I accept the terms of service</Label>
			<Description>You can read the terms at any time in your account settings.</Description>
		</CheckboxField>
	)
}
