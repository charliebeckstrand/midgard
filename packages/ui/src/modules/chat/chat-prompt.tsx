'use client'

import { ArrowUp, Paperclip, Square, X } from 'lucide-react'
import { type KeyboardEvent, type ReactNode, type Ref, useCallback } from 'react'
import { Badge } from '../../components/badge'
import { Button } from '../../components/button'
import { Control } from '../../components/control'
import { useFileUploadHandlers } from '../../components/file-upload'
import { Icon } from '../../components/icon'
import { Textarea } from '../../components/textarea'

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
	/**
	 * Picked attachments to surface as chips below the field. Each chip gains a
	 * remove button when {@link ChatPromptProps.onRemoveAttachment} is provided.
	 */
	attachments?: readonly File[]
	/** Called with the index of the attachment whose remove button was clicked. */
	onRemoveAttachment?: (index: number) => void
	/** Model picker, slash-command trigger, etc. rendered at the start of the action row, before the paperclip and send controls. */
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

/**
 * Auto-resizing chat composer built on Textarea and wrapped in a `<Control>` so
 * the textarea carries an inherent, stable id. Submits on Enter (Shift+Enter for
 * newlines), toggles its send button to a stop control while `streaming`, offers
 * a paperclip file picker when `onAttach` is provided, and surfaces `attachments`
 * as removable chips below the field. The action row — extra `actions`, the
 * paperclip, and send/stop — sits beneath the textarea, right-justified.
 */
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
	attachments,
	onRemoveAttachment,
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
		// Control supplies the stable id the textarea resolves through useControlProps.
		<Control className={className}>
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
				className="max-h-64"
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
							<Button
								size="sm"
								color="blue"
								aria-label="Stop generating"
								onClick={() => onStop?.()}
							>
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
			{attachments && attachments.length > 0 && (
				<div data-slot="chat-prompt-attachments" className="mt-2 flex flex-wrap gap-1">
					{attachments.map((file, index) => (
						<Badge
							key={`${file.name}-${file.lastModified}-${file.size}`}
							// Outline (page-surface bg) keeps the bare remove button's muted
							// `onSurface` glyph above the 3:1 non-text-contrast floor; a solid
							// fill would sink it. Matches the TagInput removable chip.
							variant="outline"
							suffix={
								onRemoveAttachment && (
									<Button
										variant="bare"
										size="sm"
										aria-label={`Remove ${file.name}`}
										onClick={() => onRemoveAttachment(index)}
									>
										<Icon icon={<X />} />
									</Button>
								)
							}
						>
							{file.name}
						</Badge>
					))}
				</div>
			)}
		</Control>
	)
}
