import { Example } from 'docs'
import { useState } from 'react'
import { Field, Label } from '../../components/fieldset'
import { TagInput } from '../../components/tag-input'

function DefaultTagInputExample() {
	const [tags, setTags] = useState<string[]>(['React', 'TypeScript'])

	return (
		<Field>
			<Label>Tags</Label>
			<TagInput value={tags} onValueChange={(v) => setTags(v ?? [])} placeholder="Add a tag" />
		</Field>
	)
}

function MaxTagInputExample() {
	const [tags, setTags] = useState<string[]>(['One', 'Two', 'Three'])

	return (
		<Field>
			<Label>Max 5 tags</Label>
			<TagInput
				value={tags}
				onValueChange={(v) => setTags(v ?? [])}
				max={5}
				placeholder="Add up to 5 tags"
			/>
		</Field>
	)
}

export function Demo() {
	return (
		<>
			<Example title="Default">
				<DefaultTagInputExample />
			</Example>

			<Example title="Max tags">
				<MaxTagInputExample />
			</Example>

			<Example title="Disabled">
				<Field>
					<Label>Disabled</Label>
					<TagInput defaultValue={['Locked', 'Tags']} disabled placeholder="Cannot edit" />
				</Field>
			</Example>
		</>
	)
}
