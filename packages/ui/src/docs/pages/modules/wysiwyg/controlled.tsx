import { useState } from 'react'
import { CodeBlock } from 'ui/code'
import { Field, Label } from 'ui/fieldset'
import { Text } from 'ui/text'
import { Wysiwyg, WysiwygToolbar } from 'ui/wysiwyg'
import { drafts } from './drafts.ts'

export default function Controlled() {
	const [notes, setNotes] = useState(drafts.notes)

	// The value is the Markdown source of the field.
	return (
		<>
			<Field>
				<Label>Notes</Label>
				<Wysiwyg value={notes} onValueChange={setNotes}>
					<WysiwygToolbar />
				</Wysiwyg>
			</Field>
			<Text>Value:{notes === '' && ' Empty'}</Text>
			{notes !== '' && <CodeBlock code={notes} lang="markdown" copy={false} />}
		</>
	)
}
