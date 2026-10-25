import { Field, Label } from 'ui/fieldset'
import { TagInput } from 'ui/tag-input'
import { topics } from '../../../data/topics.ts'

export default function Disabled() {
	return (
		<Field>
			<Label>Topics</Label>
			<TagInput defaultValue={[topics.billing, topics.invoices]} disabled />
		</Field>
	)
}
