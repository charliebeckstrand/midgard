'use client'

import { ArrowUpIcon } from '@heroicons/react/20/solid'
import { type KeyboardEvent, useState } from 'react'
import { Button } from 'ui/button'
import { Textarea } from 'ui/textarea'

type ChatComposerProps = {
	disabled?: boolean
	/** Called with the trimmed message; the input clears after it resolves. */
	onSend: (message: string) => Promise<void> | void
	className?: string
}

/**
 * Auto-resizing message input with a send button.
 *
 * @internal
 * @remarks
 * Enter sends; Shift+Enter inserts a newline. Empty/whitespace input and the
 * `disabled` state suppress sending. Composed by {@link ChatLayout}.
 */
export function ChatComposer({ disabled, onSend, className }: ChatComposerProps) {
	const [input, setInput] = useState('')

	async function handleSend() {
		const content = input.trim()

		if (!content || disabled) return

		await onSend(content)

		setInput('')
	}

	function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault()

			handleSend()
		}
	}

	return (
		<div className={`flex items-end gap-2 ${className}`}>
			<Textarea
				id="message-composer"
				autoResize
				value={input}
				onChange={(e) => setInput(e.target.value)}
				onKeyDown={handleKeyDown}
				placeholder="Ask anything"
			/>
			<Button onClick={handleSend} disabled={!input.trim() || disabled}>
				<ArrowUpIcon />
			</Button>
		</div>
	)
}
