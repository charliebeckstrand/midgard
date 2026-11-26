import { Field, Label } from 'ui/fieldset'
import { Wysiwyg, WysiwygToolbar } from 'ui/wysiwyg'
import { drafts } from './drafts.ts'

export default function ReadOnly() {
	// A read-only field stays in the tab order, and its toolbar is inert: its
	// buttons take no focus and no press. A disabled field leaves the tab order.
	return (
		<>
			<Field>
				<Label>Guide</Label>
				<Wysiwyg defaultValue={drafts.guide} readOnly>
					<WysiwygToolbar />
				</Wysiwyg>
			</Field>
			<Field disabled>
				<Label>Archived guide</Label>
				<Wysiwyg defaultValue={drafts.guide}>
					<WysiwygToolbar />
				</Wysiwyg>
			</Field>
		</>
	)
}
