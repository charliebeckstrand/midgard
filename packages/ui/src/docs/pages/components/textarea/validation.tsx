import { Field, Label, Message } from 'ui/fieldset'
import { Textarea } from 'ui/textarea'
import { words } from '../../../data/words.ts'

const drafts = words('textarea-draft', {
	bio: 'Product designer. I work on design systems and typography.',
	releaseNotes: 'Fixes a crash on launch.',
})

export default function Validation() {
	return (
		<>
			<Field severity="success">
				<Label>Bio</Label>
				<Textarea defaultValue={drafts.bio} />
				<Message severity="success">Your bio is saved.</Message>
			</Field>
			<Field severity="warning">
				<Label>Release notes</Label>
				<Textarea defaultValue={drafts.releaseNotes} />
				<Message severity="warning">Name the version that has the fix.</Message>
			</Field>
		</>
	)
}
