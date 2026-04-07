import { Field, Label } from '../../components/fieldset'
import { Textarea } from '../../components/textarea'
import { code } from '../code'
import { Example } from '../example'

export const meta = { category: 'Forms' }

export default function TextareaDemo() {
	return (
		<div className="space-y-8">
			<Example
				title="Default"
				code={code`
					import { Field, Label } from 'ui/fieldset'
					import { Textarea } from 'ui/textarea'

					<Field className="max-w-sm">
						<Label>Message</Label>
						<Textarea resize="vertical" placeholder="Write your message…" />
					</Field>
				`}
			>
				<Field className="max-w-sm">
					<Label htmlFor="textarea-message">Message</Label>
					<Textarea id="textarea-message" resize="vertical" placeholder="Write your message…" />
				</Field>
			</Example>
			<Example
				title="Non-resizable"
				code={code`
					import { Field, Label } from 'ui/fieldset'
					import { Textarea } from 'ui/textarea'

					<Field className="max-w-sm">
						<Label>Non-resizable</Label>
						<Textarea placeholder="Cannot resize" />
					</Field>
				`}
			>
				<Field className="max-w-sm">
					<Label htmlFor="textarea-non-resizable">Non-resizable</Label>
					<Textarea id="textarea-non-resizable" placeholder="Cannot resize" />
				</Field>
			</Example>
			<Example
				title="Invalid"
				code={code`
					import { Field, Label } from 'ui/fieldset'
					import { Textarea } from 'ui/textarea'

					<Field className="max-w-sm">
						<Label>Invalid</Label>
						<Textarea data-invalid placeholder="Something went wrong" />
					</Field>
				`}
			>
				<Field className="max-w-sm">
					<Label htmlFor="textarea-invalid">Invalid</Label>
					<Textarea id="textarea-invalid" data-invalid={true} placeholder="Something went wrong" />
				</Field>
			</Example>
		</div>
	)
}
