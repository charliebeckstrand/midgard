import { Checkbox, CheckboxField, CheckboxGroup } from 'ui/checkbox'
import { Description, Label } from 'ui/fieldset'

export default function Group() {
	return (
		<CheckboxGroup aria-label="Email notifications">
			<CheckboxField>
				<Checkbox defaultChecked />
				<Label>Comments</Label>
				<Description>Get an email when someone comments on your post.</Description>
			</CheckboxField>
			<CheckboxField>
				<Checkbox defaultChecked />
				<Label>Mentions</Label>
				<Description>Get an email when someone mentions you.</Description>
			</CheckboxField>
			<CheckboxField>
				<Checkbox />
				<Label>Product updates</Label>
				<Description>Get an email about new features, about once a month.</Description>
			</CheckboxField>
		</CheckboxGroup>
	)
}
