import { useState } from 'react'
import { Field, Label } from '../../../components/fieldset'
import { TagInput } from '../../../components/tag-input'
import { Text } from '../../../components/text'
import { Axes, Example } from '../../engine'

export const meta = { category: 'input' }

function ControlledExample() {
	const [tags, setTags] = useState<string[]>(['React', 'TypeScript'])

	return (
		<Example title="Controlled">
			<Field>
				<Label>Tags</Label>
				<TagInput value={tags} onValueChange={(v) => setTags(v ?? [])} placeholder="Add a tag" />
			</Field>
			<Text>{tags.length > 0 ? tags.join(', ') : 'Empty'}</Text>
		</Example>
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
			<Axes
				of="TagInput"
				render={(props, label) => (
					<TagInput {...props} aria-label={label} defaultValue={['React', 'TypeScript']} />
				)}
			/>

			<ControlledExample />

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
