import { Description, Field, Label } from 'ui/fieldset'
import { Textarea } from 'ui/textarea'

export default function MaxHeight() {
	return (
		<Field>
			<Label>Notes</Label>
			<Description>The field grows as you type. Past its maximum height, it scrolls.</Description>
			<Textarea autoResize rows={2} className="max-h-48" placeholder="Add notes for the team" />
		</Field>
	)
}
