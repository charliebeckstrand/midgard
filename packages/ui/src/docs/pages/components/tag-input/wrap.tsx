import { Field, Label } from 'ui/fieldset'
import { TagInput } from 'ui/tag-input'

export default function Wrap() {
	return (
		<Field>
			<Label>Topics</Label>
			<TagInput
				wrap
				defaultValue={['Design systems', 'Accessibility', 'Forms', 'Motion', 'Typography']}
			/>
		</Field>
	)
}
