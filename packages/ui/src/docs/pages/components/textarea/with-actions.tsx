import { ArrowUp, Paperclip } from 'lucide-react'
import { useState } from 'react'
import { Button } from 'ui/button'
import { Field, Label } from 'ui/fieldset'
import { Icon } from 'ui/icon'
import { Textarea } from 'ui/textarea'

export default function WithActions() {
	const [message, setMessage] = useState('')

	return (
		<Field>
			<Label>Message</Label>
			<Textarea
				value={message}
				onChange={(event) => setMessage(event.target.value)}
				autoResize
				rows={1}
				placeholder="Ask anything"
				actions={
					<>
						<Button aria-label="Attach file" variant="plain">
							<Icon icon={<Paperclip />} />
						</Button>
						<Button
							aria-label="Send"
							color="blue"
							disabled={message.trim() === ''}
							onClick={() => setMessage('')}
						>
							<Icon icon={<ArrowUp />} />
						</Button>
					</>
				}
			/>
		</Field>
	)
}
