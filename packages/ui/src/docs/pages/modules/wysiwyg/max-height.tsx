import { Field, Label } from 'ui/fieldset'
import { Wysiwyg, WysiwygToolbar } from 'ui/wysiwyg'
import { drafts } from './drafts.ts'

export default function MaxHeight() {
	return (
		<Field>
			<Label>Notes</Label>
			<Wysiwyg rows={2} className="max-h-48" defaultValue={drafts.plan}>
				<WysiwygToolbar />
			</Wysiwyg>
		</Field>
	)
}
