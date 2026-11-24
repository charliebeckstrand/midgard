import { Field, Label } from 'ui/fieldset'
import { Wysiwyg, WysiwygToolbar } from 'ui/wysiwyg'
import { drafts } from './drafts.ts'

export default function WithToolbar() {
	// The toolbar shows the actions in the order given, with a separator where
	// one group ends and the next starts.
	return (
		<Field>
			<Label>Release notes</Label>
			<Wysiwyg defaultValue={drafts.summary}>
				<WysiwygToolbar actions={['bold', 'italic', 'link', 'bulletList', 'orderedList']} />
			</Wysiwyg>
		</Field>
	)
}
