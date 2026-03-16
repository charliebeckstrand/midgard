import { Field, Label } from '../../components/fieldset'
import { Textarea } from '../../components/textarea'

export const meta = { category: 'Forms' }

export default function TextareaDemo() {
	return (
		<div className="max-w-sm space-y-6">
			<Field>
				<Label htmlFor="textarea-message">Message</Label>
				<Textarea id="textarea-message" placeholder="Write your message…" />
			</Field>
			<Field>
				<Label htmlFor="textarea-non-resizable">Non-resizable</Label>
				<Textarea id="textarea-non-resizable" resizable={false} placeholder="Cannot resize" />
			</Field>
			<Field>
				<Label htmlFor="textarea-invalid">Invalid</Label>
				<Textarea id="textarea-invalid" invalid placeholder="Something went wrong" />
			</Field>
		</div>
	)
}
