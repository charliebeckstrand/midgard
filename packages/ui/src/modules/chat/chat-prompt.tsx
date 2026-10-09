'use client'

import { ArrowUp, Paperclip, Square } from 'lucide-react'
import { type KeyboardEvent, type ReactNode, type Ref, useCallback } from 'react'
import { BadgeRemovable } from '../../components/badge/badge-removable'
import { Button } from '../../components/button'
import { Control } from '../../components/control'
import { useFileUploadHandlers } from '../../components/file-upload'
import { Icon } from '../../components/icon'
import { Textarea } from '../../components/textarea'
import { isComposing } from '../../utilities'
import { canSubmitDraft } from './engine/chat-draft'

/** Props for {@link ChatPrompt}. */
export type ChatPromptProps = {
	/**
	 * Controlled value of the textarea.
	 *
	 * @remarks Deliberately controlled-only: unlike the rest of the library's
	 * value controls there is no `defaultValue` arm. {@link useChatDraft} owns the
	 * draft (value, clear, submit, `canSubmit`), and an internal copy here would be
	 * a second source of truth. Pair the two.
	 */
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
	 * @defaultValue false
	 */
	streaming?: boolean
	/**
	 * The hint text that the empty textarea shows. It is not an accessible name.
	 * @defaultValue 'Ask anything'
	 */
	placeholder?: string
	/**
	 * The minimum height of the textarea, in lines. The textarea grows with its
	 * content past this height.
	 * @defaultValue 2
	 */
	rows?: number
	/**
	 * Disables send without disabling the textarea (e.g. empty input).
	 * @defaultValue false
	 */
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
	 * @defaultValue 'Message'
	 */
	'aria-label'?: string
	/** Points at a visible label for the composer, in place of `aria-label`. */
	'aria-labelledby'?: string
}

/**
 * Auto-resizing chat composer built on Textarea and wrapped in a `<Control>` so
 * the textarea carries an inherent, stable id. Submits on Enter (Shift+Enter for
 * newlines), and toggles its send button to a stop control while `streaming`. It
 * offers a paperclip file picker when `onAttach` is provided, and surfaces
 * `attachments` as removable chips below the field. The action row — extra `actions`, the
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
	const canSubmit = !disabled && canSubmitDraft(value)

	const { inputRef, openPicker, handleChange } = useFileUploadHandlers({ onAccept: onAttach })

	// The composer always gets an accessible name (WCAG 3.3.2 / 4.1.2):
	// aria-labelledby wins over aria-label; falls back to 'Message'.
	const labelProps = ariaLabelledBy
		? { 'aria-labelledby': ariaLabelledBy }
		: { 'aria-label': ariaLabel ?? 'Message' }

	const handleKeyDown = useCallback(
		(event: KeyboardEvent<HTMLTextAreaElement>) => {
			if (event.key !== 'Enter' || event.shiftKey || isComposing(event)) return

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
								    nested-interactive markup. The Button is the one control:
								    the input is `hidden`, so browse mode does not read a
								    second "Add attachment", and `click()` still opens the picker. */}
								<input
									ref={inputRef}
									type="file"
									accept={accept}
									multiple
									onChange={handleChange}
									hidden
								/>
								<Button
									type="button"
									variant="plain"
									aria-label="Add attachment"
									onClick={openPicker}
								>
									<Icon icon={<Paperclip />} />
								</Button>
							</>
						)}
						{streaming ? (
							<Button
								type="button"
								color="blue"
								aria-label="Stop generating"
								onClick={() => onStop?.()}
							>
								<Icon icon={<Square />} />
							</Button>
						) : (
							<Button
								type="button"
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
				// The row wraps. The remove buttons of two rows are the `gap-1` of the
				// row and the `py-ring-1` pad of two chips apart, so the row caps the
				// height of each hit area (`TouchTarget`) at that 10px.
				// A list, so assistive tech reads the count of the attachments.
				<ul
					data-slot="chat-prompt-attachments"
					className="mt-2 flex list-none flex-wrap gap-1 [--touch-target-gap-y:--spacing(2.5)]"
				>
					{attachments.map((file, index) => (
						// `flex` keeps the line box of the item off the height of the chip, and
						// `max-w-full` holds a long name to the row, so the chip truncates it.
						<li key={`${file.name}-${file.lastModified}-${file.size}`} className="flex max-w-full">
							<BadgeRemovable
								label={file.name}
								onRemove={onRemoveAttachment && (() => onRemoveAttachment(index))}
							/>
						</li>
					))}
				</ul>
			)}
		</Control>
	)
}
