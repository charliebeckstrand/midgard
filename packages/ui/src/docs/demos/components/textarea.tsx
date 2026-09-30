import { ArrowUp, Paperclip } from 'lucide-react'
import { useId, useState } from 'react'
import { Button } from '../../../components/button'
import { Field, Label } from '../../../components/fieldset'
import { Icon } from '../../../components/icon'
import { Textarea } from '../../../components/textarea'
import { Axes, Example } from '../../engine'

function WithActionsExample() {
	const [withActionsValue, setWithActionsValue] = useState('')

	const id = useId()

	return (
		<Field>
			<Label htmlFor={id}>With actions</Label>
			<Textarea
				id={id}
				value={withActionsValue}
				onChange={(event) => setWithActionsValue(event.target.value)}
				autoResize
				rows={1}
				placeholder="Ask anything"
				actions={
					<>
						<Button aria-label="Attach file" variant="plain">
							<Icon icon={<Paperclip />} />
						</Button>
						<Button aria-label="Send" color="blue" disabled={!withActionsValue.trim()}>
							<Icon icon={<ArrowUp />} />
						</Button>
					</>
				}
			/>
		</Field>
	)
}

export function Demo() {
	return (
		<>
			<Axes
				of="Textarea"
				captions={false}
				render={(props, label) => <Textarea {...props} aria-label={label} placeholder={label} />}
			/>

			<Example title="With actions">
				<WithActionsExample />
			</Example>

			<Example title="Invalid">
				<Field>
					<Label htmlFor="textarea-invalid">Invalid</Label>
					<Textarea id="textarea-invalid" data-invalid={true} placeholder="Something went wrong" />
				</Field>
			</Example>

			<Example title="Valid">
				<Field>
					<Label htmlFor="textarea-valid">Valid</Label>
					<Textarea id="textarea-valid" data-valid={true} placeholder="Everything is fine" />
				</Field>
			</Example>

			<Example title="Warning">
				<Field>
					<Label htmlFor="textarea-warning">Warning</Label>
					<Textarea
						id="textarea-warning"
						data-warning={true}
						placeholder="Something might be wrong"
					/>
				</Field>
			</Example>
		</>
	)
}
