import { Field, Label } from 'ui/fieldset'
import { TagInput } from 'ui/tag-input'
import { topics } from '../../../data/topics.ts'

export default function Wrap() {
	return (
		<Field>
			<Label>Topics</Label>
			<TagInput
				wrap
				defaultValue={[
					topics.designSystems,
					topics.accessibility,
					topics.forms,
					topics.motion,
					topics.typography,
				]}
			/>
		</Field>
	)
}
