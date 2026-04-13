'use client'

import { useState } from 'react'
import { Field, Label } from '../../components/fieldset'
import { Sizer } from '../../components/sizer'
import { TagInput } from '../../components/tag-input'
import { code } from '../code'
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

export default function TagInputDemo() {
	return (
		<div className="space-y-8">
			<Example
				title="Default"
				code={code`
					import { TagInput } from 'ui/tag-input'
					import { Field, Label } from 'ui/fieldset'

					<Field>
						<Label>Tags</Label>
						<TagInput value={tags} onChange={(v) => setTags(v ?? [])} placeholder="Add a tag" />
					</Field>
				`}
			>
				<DefaultTagInput />
			</Example>

			<Example title="Sizes">
				<SizedTagInputs />
			</Example>

			<Example
				title="Max tags"
				code={code`
					<TagInput value={tags} onChange={(v) => setTags(v ?? [])} max={5} placeholder="Add up to 5 tags..." />
				`}
			>
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
		</div>
	)
}
