'use client'

import { ArrowUpIcon } from '@heroicons/react/20/solid'
import { Button } from 'catalyst'
import { useState } from 'react'
import TextareaAutosize from 'react-textarea-autosize'

interface Props {
	disabled?: boolean
	onSend: (message: string) => void
}

export function ChatInput({ disabled, onSend }: Props) {
	const [input, setInput] = useState('')

	function handleSend() {
		const content = input.trim()

		if (!content || disabled) return

		setInput('')
		onSend(content)
	}

	function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault()
			handleSend()
		}
	}

	return (
		<div className="flex items-center justify-center">
			<div className="flex w-full items-center gap-2 px-4">
				<span className="relative block flex-1 before:absolute before:inset-px before:rounded-[calc(var(--radius-lg)-1px)] before:bg-white before:shadow-sm dark:before:hidden after:pointer-events-none after:absolute after:inset-0 after:rounded-lg after:ring-transparent after:ring-inset sm:focus-within:after:ring-2 sm:focus-within:after:ring-blue-500">
					<TextareaAutosize
						rows={1}
						minRows={1}
						maxRows={8}
						value={input}
						onChange={(e) => setInput(e.target.value)}
						onKeyDown={handleKeyDown}
						placeholder="Type a message..."
						className="relative block min-h-9 w-full resize-none appearance-none overflow-hidden rounded-lg border border-zinc-950/10 bg-transparent px-[calc(--spacing(3.5)-1px)] py-[calc(--spacing(2.5)-1px)] text-base/6 text-zinc-950 placeholder:text-zinc-500 focus:outline-hidden hover:border-zinc-950/20 sm:px-[calc(--spacing(3)-1px)] sm:py-[calc(--spacing(1.5)-1px)] sm:text-sm/6 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:border-white/20"
					/>
				</span>
				<Button onClick={handleSend} disabled={!input.trim() || disabled}>
					<ArrowUpIcon className="text-white!" />
				</Button>
			</div>
		</div>
	)
}
