import { Field, Label } from 'ui/fieldset'
import { TagInput } from 'ui/tag-input'

export default function Disabled() {
	return (
		<Field>
			<Label>Topics</Label>
			<TagInput defaultValue={['Billing', 'Invoices']} disabled />
		</Field>
	)
}
