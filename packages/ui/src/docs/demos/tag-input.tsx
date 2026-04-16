'use client'

import { useState } from 'react'
import { Field, Label } from '../../components/fieldset'
import { Glass } from '../../components/glass'
import { Sizer } from '../../components/sizer'
import { Stack } from '../../components/stack'
import { TagInput } from '../../components/tag-input'
import { Example } from '../components/example'

export const meta = { category: 'Forms' }

function DefaultTagInput() {
	const [tags, setTags] = useState<string[]>(['React', 'TypeScript'])

	return (
		<Sizer>
			<Field>
				<Label>Tags</Label>
				<TagInput value={tags} onChange={(v) => setTags(v ?? [])} placeholder="Add a tag" />
			</Field>
		</Sizer>
	)
}

function SizedTagInputs() {
	return (
		<Sizer>
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
		</Sizer>
	)
}

function MaxTagInput() {
	const [tags, setTags] = useState<string[]>(['One', 'Two', 'Three'])

	return (
		<Sizer>
			<Field>
				<Label>Max 5 tags</Label>
				<TagInput
					value={tags}
					onChange={(v) => setTags(v ?? [])}
					max={5}
					placeholder="Add up to 5 tags"
				/>
			</Field>
		</Sizer>
	)
}

function GlassTagInput() {
	const [tags, setTags] = useState<string[]>(['React', 'TypeScript'])

	return (
		<Glass>
			<Sizer>
				<Field>
					<Label>Tags</Label>
					<TagInput value={tags} onChange={(v) => setTags(v ?? [])} placeholder="Add a tag" />
				</Field>
			</Sizer>
		</Glass>
	)
}

export default function TagInputDemo() {
	return (
		<Stack gap={6}>
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
				<Sizer>
					<Field>
						<Label>Disabled</Label>
						<TagInput defaultValue={['Locked', 'Tags']} disabled placeholder="Cannot edit" />
					</Field>
				</Sizer>
			</Example>

			<Example title="Glass">
				<GlassTagInput />
			</Example>
		</Stack>
	)
}
