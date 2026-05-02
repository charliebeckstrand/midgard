'use client'

import { useState } from 'react'
import { Field, Label } from '../../components/fieldset'
import { Stack } from '../../components/stack'
import { TagInput } from '../../components/tag-input'
import { Example } from '../components/example'

export const meta = { category: 'Input' }

function DefaultTagInput() {
	const [tags, setTags] = useState<string[]>(['React', 'TypeScript'])

	return (
		<Field>
			<Label>Tags</Label>
			<TagInput value={tags} onChange={(v) => setTags(v ?? [])} placeholder="Add a tag" />
		</Field>
	)
}

function SizedTagInputs() {
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

function MaxTagInput() {
	const [tags, setTags] = useState<string[]>(['One', 'Two', 'Three'])

	return (
		<Field>
			<Label>Max 5 tags</Label>
			<TagInput
				value={tags}
				onChange={(v) => setTags(v ?? [])}
				max={5}
				placeholder="Add up to 5 tags"
			/>
		</Field>
	)
}

export default function TagInputDemo() {
	return (
		<Stack gap="xl">
			<Example title="Default">
				<DefaultTagInput />
			</Example>

			<Example title="Sizes">
				<SizedTagInputs />
			</Example>

			<Example title="Max tags">
				<MaxTagInput />
			</Example>

			<Example title="Disabled">
				<Field>
					<Label>Disabled</Label>
					<TagInput defaultValue={['Locked', 'Tags']} disabled placeholder="Cannot edit" />
				</Field>
			</Example>
		</Stack>
	)
}
