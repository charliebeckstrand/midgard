import { ArrowUp, Paperclip } from 'lucide-react'
import { useRef, useState } from 'react'
import { Field, Label } from 'ui/fieldset'
import { IconButton } from 'ui/icon-button'
import { Textarea } from 'ui/textarea'

export default function WithActions() {
	const [message, setMessage] = useState('')

	const messageRef = useRef<HTMLTextAreaElement>(null)

	// The send empties the message, which disables the Send button, so it gives the
	// focus to the message first.
	const send = () => {
		messageRef.current?.focus()

		setMessage('')
	}

	return (
		<Field>
			<Label>Message</Label>
			<Textarea
				ref={messageRef}
				value={message}
				onChange={(event) => setMessage(event.target.value)}
				autoResize
				rows={1}
				placeholder="Ask anything"
				actions={
					<>
						<IconButton aria-label="Attach file" variant="plain" icon={<Paperclip />} />
						<IconButton
							aria-label="Send"
							color="blue"
							disabled={message.trim() === ''}
							onClick={send}
							variant="solid"
							icon={<ArrowUp />}
						/>
					</>
				}
			/>
		</Field>
	)
}
