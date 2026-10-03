import { ArrowUp, Paperclip } from 'lucide-react'
import { useState } from 'react'
import { Button } from '../../../components/button'
import { Field, Label } from '../../../components/fieldset'
import { Icon } from '../../../components/icon'
import { Textarea } from '../../../components/textarea'
import { Axes, Example } from '../../engine'

function WithActionsExample() {
	const [withActionsValue, setWithActionsValue] = useState('')

	return (
		<Field>
			<Label>With actions</Label>
			<Textarea
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

			<Example title="Valid">
				<Field>
					<Label>Valid</Label>
					<Textarea data-valid={true} placeholder="Everything is fine" />
				</Field>
			</Example>

			<Example title="Warning">
				<Field>
					<Label>Warning</Label>
					<Textarea data-warning={true} placeholder="Something might be wrong" />
				</Field>
			</Example>
		</>
	)
}
