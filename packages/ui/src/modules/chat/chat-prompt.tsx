'use client'

import { ArrowUp, Paperclip, Square } from 'lucide-react'
import { type KeyboardEvent, type ReactNode, type Ref, useCallback } from 'react'
import { Button } from '../../components/button'
import { useFileUploadHandlers } from '../../components/file-upload'
import { Icon } from '../../components/icon'
import { Textarea } from '../../components/textarea'
import { cn } from '../../core'

/** Props for {@link ChatPrompt}. */
export type ChatPromptProps = {
	/** Controlled value of the textarea. */
	value: string
	/** Called with the next value as the user types. */
	onValueChange: (value: string) => void
	/** Called when the user submits (Enter without Shift, or send button). */
	onSubmit: () => void
	/** Called when the user stops a streaming response via the send→stop toggle. */
	onStop?: () => void
	/**
	 * When true, the send button renders as a stop button and invokes `onStop`.
	 *
	 * @defaultValue `false`
	 */
	streaming?: boolean
	/** @defaultValue `'Ask anything'` */
	placeholder?: string
	/** @defaultValue `2` */
	rows?: number
	/** Disables send without disabling the textarea (e.g. empty input). */
	disabled?: boolean
	/**
	 * Called with the chosen files when the user picks attachments. The
	 * paperclip button renders only when this is provided.
	 */
	onAttach?: (files: File[]) => void
	/** Accepted attachment types (e.g. `".pdf,.csv"`); forwarded to the file picker. */
	accept?: string
	/** Model picker, slash-command trigger, etc. rendered on the left of the action row. */
	actions?: ReactNode
	className?: string
	/** Ref to the underlying textarea (e.g. to focus the composer imperatively). */
	ref?: Ref<HTMLTextAreaElement>
	/**
	 * Accessible name for the composer. A placeholder is not an accessible name;
	 * the textarea defaults to `"Message"` when neither this nor
	 * `aria-labelledby` is supplied (WCAG 3.3.2 / 4.1.2). Pass `aria-labelledby`
	 * instead to point at a visible label.
	 */
	'aria-label'?: string
	'aria-labelledby'?: string
}

/** Auto-resizing chat composer built on Textarea. Submits on Enter (Shift+Enter for newlines), toggles its send button to a stop control while `streaming`, and offers a paperclip file picker when `onAttach` is provided. */
export function ChatPrompt({
	value,
	onValueChange,
	onSubmit,
	onStop,
	streaming = false,
	placeholder = 'Ask anything',
	rows = 2,
	disabled,
	onAttach,
	accept,
	actions,
	className,
	ref,
	'aria-label': ariaLabel,
	'aria-labelledby': ariaLabelledBy,
}: ChatPromptProps) {
	const canSubmit = !disabled && value.trim().length > 0

	const { inputRef, openPicker, handleChange } = useFileUploadHandlers({ onFiles: onAttach })

	// The composer always gets an accessible name (WCAG 3.3.2 / 4.1.2):
	// aria-labelledby wins over aria-label; falls back to 'Message'.
	const labelProps = ariaLabelledBy
		? { 'aria-labelledby': ariaLabelledBy }
		: { 'aria-label': ariaLabel ?? 'Message' }

	const handleKeyDown = useCallback(
		(event: KeyboardEvent<HTMLTextAreaElement>) => {
			if (event.key !== 'Enter' || event.shiftKey || event.nativeEvent.isComposing) return

			event.preventDefault()

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
			ref={ref}
			data-slot="chat-prompt"
			value={value}
			onChange={(event) => onValueChange(event.target.value)}
			onKeyDown={handleKeyDown}
			autoResize
			rows={rows}
			placeholder={placeholder}
			{...labelProps}
			className={cn('max-h-64', className)}
			actions={
				<>
					{actions}
					{onAttach && (
						<>
							{/* Sibling of the button, not nested inside it: a focusable
							    `<input>` inside an interactive control produces
							    nested-interactive markup. */}
							<input
								ref={inputRef}
								type="file"
								aria-label="Add attachment"
								accept={accept}
								multiple
								onChange={handleChange}
								className="sr-only"
								tabIndex={-1}
							/>
							<Button variant="plain" size="sm" aria-label="Add attachment" onClick={openPicker}>
								<Icon icon={<Paperclip />} />
							</Button>
						</>
					)}
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
