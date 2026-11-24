import { Field, Label } from 'ui/fieldset'
import { Wysiwyg, WysiwygToolbar } from 'ui/wysiwyg'
import { drafts } from './drafts.ts'

export default function Separated() {
	// The toolbar sits above the frame, and only the text area has the frame.
	return (
		<Field>
			<Label>Release notes</Label>
			<Wysiwyg separated defaultValue={drafts.summary}>
				<WysiwygToolbar />
			</Wysiwyg>
		</Field>
	)
}
