'use client'

import { ArrowUp, Paperclip, Square } from 'lucide-react'
import { type KeyboardEvent, useCallback } from 'react'
import { cn } from '../../core'
import { Button } from '../button'
import { Icon } from '../icon'
import { Spacer } from '../spacer'
import { Textarea } from '../textarea'

export type ChatPromptProps = {
	/** Controlled value of the textarea. */
	value: string
	/** Called with the next value as the user types. */
	onValueChange: (value: string) => void
	/** Called when the user submits (Enter without Shift, or send button). */
	onSubmit: () => void
	/** Called when the user stops a streaming response via the send→stop toggle. */
	onStop?: () => void
	/** When true, the send button renders as a stop button and invokes `onStop`. */
	streaming?: boolean
	placeholder?: string
	rows?: number
	/** Disables send without disabling the textarea (e.g. empty input). */
	disabled?: boolean
	/** Attachments, model picker, slash-command trigger, etc. rendered on the left of the action row. */
	actions?: React.ReactNode
	className?: string
}

export function ChatPrompt({
	value,
	onValueChange,
	onSubmit,
	onStop,
	streaming = false,
	placeholder = 'Ask anything',
	rows = 2,
	disabled,
	actions,
	className,
}: ChatPromptProps) {
	const canSubmit = !disabled && value.trim().length > 0

	const handleKeyDown = useCallback(
		(e: KeyboardEvent<HTMLTextAreaElement>) => {
			if (e.key !== 'Enter' || e.shiftKey || e.nativeEvent.isComposing) return

			e.preventDefault()

			if (streaming) {
				onStop?.()
			} else if (canSubmit) {
				onSubmit()
			}
		},
		[streaming, canSubmit, onSubmit, onStop],
	)

	return (
		<Textarea
			data-slot="chat-prompt"
			value={value}
			onChange={(e) => onValueChange(e.target.value)}
			onKeyDown={handleKeyDown}
			autoResize
			rows={rows}
			placeholder={placeholder}
			className={cn('max-h-64', className)}
			actions={
				<>
					{actions}
					<Spacer />
					<Button variant="plain" size="sm">
						<Icon icon={<Paperclip />} />
					</Button>
					{streaming ? (
						<Button size="sm" color="blue" aria-label="Stop generating" onClick={() => onStop?.()}>
							<Icon icon={<Square />} />
						</Button>
					) : (
						<Button
							size="sm"
							color="blue"
							aria-label="Send message"
							disabled={!canSubmit}
							onClick={() => canSubmit && onSubmit()}
						>
							<Icon icon={<ArrowUp />} />
						</Button>
					)}
				</>
			}
		/>
	)
}
