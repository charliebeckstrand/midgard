import { Field, Label, Message } from 'ui/fieldset'
import { Textarea } from 'ui/textarea'

export default function Validation() {
	return (
		<>
			<Field severity="success">
				<Label>Bio</Label>
				<Textarea defaultValue="Product designer in Lisbon. I work on design systems and type." />
				<Message severity="success">Your bio is saved.</Message>
			</Field>
			<Field severity="warning">
				<Label>Release notes</Label>
				<Textarea defaultValue="Fixes a crash on launch." />
				<Message severity="warning">Name the version that has the fix.</Message>
			</Field>
		</>
	)
}
