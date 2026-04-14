'use client'

import { ArrowUpIcon } from '@heroicons/react/20/solid'
import { useState } from 'react'
import { Button } from 'ui/button'
import { Textarea } from 'ui/textarea'

interface Props {
	disabled?: boolean
	onSend: (message: string) => Promise<void> | void
	className?: string
}

export function ChatComposer({ disabled, onSend, className }: Props) {
	const [input, setInput] = useState('')

	async function handleSend() {
		const content = input.trim()

		if (!content || disabled) return

		await onSend(content)

		setInput('')
	}

	function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
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
