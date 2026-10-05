import { Description, Field, Label } from 'ui/fieldset'
import { TagInput } from 'ui/tag-input'

export default function MaxTags() {
	return (
		<Field>
			<Label>Keywords</Label>
			<Description>Add up to five keywords.</Description>
			<TagInput defaultValue={['Design', 'Accessibility', 'Forms']} max={5} />
		</Field>
	)
}
