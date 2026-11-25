import { Field, Label } from 'ui/fieldset'
import { Textarea } from 'ui/textarea'
import { drafts } from './drafts.ts'

export default function MaxHeight() {
	return (
		<Field>
			<Label>Notes</Label>
			<Textarea autoResize rows={2} className="max-h-48" defaultValue={drafts.notes} />
		</Field>
	)
}
