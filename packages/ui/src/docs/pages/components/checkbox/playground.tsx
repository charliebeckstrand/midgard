import { Checkbox, CheckboxField, type CheckboxProps } from 'ui/checkbox'
import { Label } from 'ui/fieldset'

export default function CheckboxPlayground(props: CheckboxProps) {
	return (
		<CheckboxField>
			<Checkbox defaultChecked {...props} />
			<Label>Email me a weekly summary</Label>
		</CheckboxField>
	)
}
