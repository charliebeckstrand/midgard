import { useState } from 'react'
import { Field, Label } from 'ui/fieldset'
import { TagInput } from 'ui/tag-input'
import { Text } from 'ui/text'

export default function Controlled() {
	const [tags, setTags] = useState(['React', 'TypeScript'])

	return (
		<>
			<Field>
				<Label>Skills</Label>
				<TagInput value={tags} onValueChange={setTags} placeholder="Add a skill" />
			</Field>
			<Text>Value: {tags.length > 0 ? tags.join(', ') : 'Empty'}</Text>
		</>
	)
}
