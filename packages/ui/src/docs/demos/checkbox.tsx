import { Checkbox, CheckboxField, CheckboxGroup } from '../../components/checkbox'
import { Description, Label } from '../../components/fieldset'

export const meta = { category: 'Forms' }

export default function CheckboxDemo() {
	return (
		<CheckboxGroup>
			<CheckboxField>
				<Checkbox id="checkbox-terms" />
				<Label htmlFor="checkbox-terms">Accept terms and conditions</Label>
				<Description>You agree to our Terms of Service and Privacy Policy.</Description>
			</CheckboxField>
			<CheckboxField>
				<Checkbox id="checkbox-newsletter" defaultChecked />
				<Label htmlFor="checkbox-newsletter">Subscribe to newsletter</Label>
			</CheckboxField>
			<CheckboxField>
				<Checkbox id="checkbox-disabled" disabled />
				<Label htmlFor="checkbox-disabled">Disabled option</Label>
			</CheckboxField>
		</CheckboxGroup>
	)
}
