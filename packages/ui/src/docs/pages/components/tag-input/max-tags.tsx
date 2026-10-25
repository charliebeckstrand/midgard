import { Description, Field, Label } from 'ui/fieldset'
import { TagInput } from 'ui/tag-input'
import { topics } from '../../../data/topics.ts'

export default function MaxTags() {
	return (
		<Field>
			<Label>Keywords</Label>
			<Description>Add up to five keywords.</Description>
			<TagInput defaultValue={[topics.design, topics.accessibility, topics.forms]} max={5} />
		</Field>
	)
}
