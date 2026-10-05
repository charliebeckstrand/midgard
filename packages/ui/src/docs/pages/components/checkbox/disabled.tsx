import { Checkbox, CheckboxField, CheckboxGroup } from 'ui/checkbox'
import { Description, Label } from 'ui/fieldset'

export default function Disabled() {
	return (
		<CheckboxGroup aria-label="Permissions">
			<CheckboxField>
				<Checkbox disabled defaultChecked />
				<Label>View projects</Label>
				<Description>Every member can view projects.</Description>
			</CheckboxField>
			<CheckboxField>
				<Checkbox disabled />
				<Label>Delete projects</Label>
				<Description>Only an owner can delete projects.</Description>
			</CheckboxField>
		</CheckboxGroup>
	)
}
