'use client'

import { ArrowUpIcon } from '@heroicons/react/20/solid'
import { useState } from 'react'
import TextareaAutosize from 'react-textarea-autosize'
import { Button } from 'ui/button'

interface Props {
	disabled?: boolean
	onSend: (message: string) => void
}

export function ChatComposer({ disabled, onSend }: Props) {
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
		<div className="flex items-center justify-center gap-2">
			<TextareaAutosize
				autoFocus
				rows={1}
				minRows={1}
				maxRows={8}
				value={input}
				onChange={(e) => setInput(e.target.value)}
				onKeyDown={handleKeyDown}
				placeholder="Ask anything"
				className="relative block min-h-9 w-full resize-none appearance-none overflow-hidden rounded-lg border border-zinc-950/10 bg-transparent px-[calc(--spacing(3.5)-1px)] py-[calc(--spacing(2.5)-1px)] text-base/6 text-zinc-950 placeholder:text-zinc-500 focus:outline-hidden hover:border-zinc-950/20 sm:px-[calc(--spacing(3)-1px)] sm:py-[calc(--spacing(1.5)-1px)] sm:text-sm/6 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:border-white/20"
			/>
			<Button onClick={handleSend} disabled={!input.trim() || disabled}>
				<ArrowUpIcon className="dark:fill-white! fill-black!" />
			</Button>
		</div>
	)
}
