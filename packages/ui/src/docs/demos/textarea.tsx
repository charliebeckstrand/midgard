import { Field, Label } from '../../components/fieldset'
import { Textarea } from '../../components/textarea'

export const meta = { category: 'Forms' }

export default function TextareaDemo() {
	return (
		<div className="max-w-sm space-y-6">
			<Field>
				<Label>Message</Label>
				<Textarea placeholder="Write your message…" />
			</Field>
			<Field>
				<Label>Non-resizable</Label>
				<Textarea resizable={false} placeholder="Cannot resize" />
			</Field>
			<Field>
				<Label>Invalid</Label>
				<Textarea invalid placeholder="Something went wrong" />
			</Field>
		</div>
	)
}
