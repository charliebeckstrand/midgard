import { Field, Label } from '../../components/fieldset'
import { Textarea } from '../../components/textarea'
import { Example } from '../example'

export const meta = { category: 'Forms' }

export default function TextareaDemo() {
	return (
		<div className="space-y-8">
			<Example title="Default">
				<Field className="lg:max-w-sm">
					<Label htmlFor="textarea-message">Message</Label>
					<Textarea id="textarea-message" resize="vertical" placeholder="Write your message" />
				</Field>
			</Example>
			<Example title="Non-resizable">
				<Field className="lg:max-w-sm">
					<Label htmlFor="textarea-non-resizable">Non-resizable</Label>
					<Textarea id="textarea-non-resizable" placeholder="Cannot resize" />
				</Field>
			</Example>
			<Example title="Invalid">
				<Field className="lg:max-w-sm">
					<Label htmlFor="textarea-invalid">Invalid</Label>
					<Textarea id="textarea-invalid" data-invalid={true} placeholder="Something went wrong" />
				</Field>
			</Example>
		</div>
	)
}
