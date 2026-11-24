import { Field, Label } from 'ui/fieldset'
import { Wysiwyg, WysiwygToolbar } from 'ui/wysiwyg'

export default function MaxHeight() {
	return (
		<Field>
			<Label>Notes</Label>
			<Wysiwyg rows={2} className="max-h-48" placeholder="Add notes for the team">
				<WysiwygToolbar />
			</Wysiwyg>
		</Field>
	)
}
