import { Field, Label } from 'ui/fieldset'
import { Wysiwyg, WysiwygToolbar } from 'ui/wysiwyg'
import { drafts } from './drafts.ts'

export default function WithHeadings() {
	// Heading shows the levels Text, H1, H2, and H3 in place of the toolbar row.
	// A press on a level sets it, and the row comes back. Mod+Alt+1 to 3 also set
	// a level, and Mod+Alt+0 makes text.
	return (
		<Field>
			<Label>Release notes</Label>
			<Wysiwyg defaultValue={drafts.release}>
				<WysiwygToolbar actions={['heading', 'bold', 'italic', 'bulletList', 'link']} />
			</Wysiwyg>
		</Field>
	)
}
