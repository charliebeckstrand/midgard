import { Description, Field, Label } from 'ui/fieldset'
import { TagInput } from 'ui/tag-input'

function isEmail(tag: string) {
	return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(tag)
}

export default function Validation() {
	return (
		<Field>
			<Label>Invite people</Label>
			<Description>Enter email addresses, separated by commas.</Description>
			<TagInput defaultValue={['jane@example.com']} validate={isEmail} />
		</Field>
	)
}
