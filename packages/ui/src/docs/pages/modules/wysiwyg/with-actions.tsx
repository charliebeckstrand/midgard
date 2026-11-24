import { ArrowUp } from 'lucide-react'
import { useRef, useState } from 'react'
import { Button } from 'ui/button'
import { Field, Label } from 'ui/fieldset'
import { Icon } from 'ui/icon'
import { Wysiwyg, type WysiwygHandle, WysiwygToolbar } from 'ui/wysiwyg'

export default function WithActions() {
	const [message, setMessage] = useState('')

	const messageRef = useRef<WysiwygHandle>(null)

	// Enter sends, and Shift+Enter starts a new line. The send empties the message,
	// which disables the Send button, so it gives the focus to the message first.
	const send = () => {
		if (message.trim() === '') return

		messageRef.current?.focus()

		setMessage('')
	}

	return (
		<Field>
			<Label>Message</Label>
			<Wysiwyg
				ref={messageRef}
				value={message}
				onValueChange={setMessage}
				onEnter={send}
				enterKeyHint="send"
				rows={1}
				placeholder="Ask anything"
				actions={
					<Button aria-label="Send" color="blue" disabled={message.trim() === ''} onClick={send}>
						<Icon icon={<ArrowUp />} />
					</Button>
				}
			>
				<WysiwygToolbar actions={['bold', 'italic', 'link', 'code']} />
			</Wysiwyg>
		</Field>
	)
}
