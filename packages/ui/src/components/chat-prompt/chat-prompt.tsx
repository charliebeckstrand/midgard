'use client'

import { ArrowUp, Paperclip, Square } from 'lucide-react'
import { type KeyboardEvent, type ReactNode, useCallback } from 'react'
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
	actions?: ReactNode
	className?: string
	/**
	 * Accessible name for the composer. A placeholder is not an accessible name,
	 * so the textarea defaults to `"Message"` when neither this nor
	 * `aria-labelledby` is supplied (WCAG 3.3.2 / 4.1.2). Pass `aria-labelledby`
	 * instead to point at a visible label.
	 */
	'aria-label'?: string
	'aria-labelledby'?: string
}

/** Auto-resizing chat composer built on Textarea — submits on Enter (Shift+Enter for newlines) and toggles its send button to a stop control while `streaming`. */
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
	'aria-label': ariaLabel,
	'aria-labelledby': ariaLabelledBy,
}: ChatPromptProps) {
	const canSubmit = !disabled && value.trim().length > 0

	// Placeholder text is not an accessible name; ensure the composer always
	// carries one. An explicit label/labelledby wins; otherwise fall back to a
	// generic name rather than leaving the field unnamed.
	const labelProps = ariaLabelledBy
		? { 'aria-labelledby': ariaLabelledBy }
		: { 'aria-label': ariaLabel ?? 'Message' }

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
			{...labelProps}
			className={cn('max-h-64', className)}
			actions={
				<>
					{actions}
					<Spacer />
					<Button variant="plain" size="sm" aria-label="Add attachment">
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
