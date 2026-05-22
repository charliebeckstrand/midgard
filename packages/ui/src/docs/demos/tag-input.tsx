'use client'

import { useState } from 'react'
import { Field, Label } from '../../components/fieldset'
import { TagInput } from '../../components/tag-input'
import { Example } from '../components/example'

export const meta = { category: 'Input' }

function DefaultTagInputExample() {
	const [tags, setTags] = useState<string[]>(['React', 'TypeScript'])

	return (
		<Field>
			<Label>Tags</Label>
			<TagInput value={tags} onValueChange={(v) => setTags(v ?? [])} placeholder="Add a tag" />
		</Field>
	)
}

function SizedTagInputsExample() {
	return (
		<>
			<Field>
				<Label>Small</Label>
				<TagInput size="sm" defaultValue={['Alpha', 'Beta']} placeholder="Add a tag" />
			</Field>
			<Field>
				<Label>Medium</Label>
				<TagInput size="md" defaultValue={['Alpha', 'Beta']} placeholder="Add a tag" />
			</Field>
			<Field>
				<Label>Large</Label>
				<TagInput size="lg" defaultValue={['Alpha', 'Beta']} placeholder="Add a tag" />
			</Field>
		</>
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

			<Example title="Sizes">
				<SizedTagInputsExample />
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
