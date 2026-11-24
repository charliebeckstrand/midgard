import { Field, Label, Message } from 'ui/fieldset'
import { Wysiwyg } from 'ui/wysiwyg'
import { drafts } from './drafts.ts'

export default function Validation() {
	return (
		<>
			<Field severity="success">
				<Label>Summary</Label>
				<Wysiwyg defaultValue={drafts.summary} />
				<Message severity="success">Your summary is saved.</Message>
			</Field>
			<Field severity="error">
				<Label>Steps</Label>
				<Wysiwyg placeholder="List the steps" />
				<Message severity="error">Add the steps to reproduce.</Message>
			</Field>
		</>
	)
}
