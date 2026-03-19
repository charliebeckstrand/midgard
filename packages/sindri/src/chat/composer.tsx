'use client'

import { ArrowUpIcon } from '@heroicons/react/20/solid'
import { useState } from 'react'
import TextareaAutosize from 'react-textarea-autosize'
import { Button } from 'ui/button'

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
			<TextareaAutosize
				id="message-composer"
				// autoFocus
				rows={1}
				minRows={1}
				maxRows={8}
				value={input}
				onChange={(e) => setInput(e.target.value)}
				onKeyDown={handleKeyDown}
				placeholder="Ask anything"
				className="relative block w-full resize-none appearance-none overflow-hidden rounded-lg ring-1 ring-zinc-950/10 bg-transparent px-4 py-2 text-base/6 text-zinc-950 placeholder:text-zinc-500 focus:outline-hidden dark:ring-white/10 dark:bg-white/5 dark:hover:bg-white/6 dark:focus:bg-white/6 dark:text-white"
			/>
			<Button onClick={handleSend} disabled={!input.trim() || disabled}>
				<ArrowUpIcon className="dark:fill-white! fill-black!" />
			</Button>
		</div>
	)
}
