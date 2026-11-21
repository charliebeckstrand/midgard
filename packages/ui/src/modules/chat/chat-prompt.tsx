'use client'

import { useComposedRefs } from 'motion/react'
import {
	type ChangeEvent,
	type KeyboardEvent,
	type ReactNode,
	type Ref,
	useCallback,
	useLayoutEffect,
	useRef,
} from 'react'
import { BadgeRemovable } from '../../components/badge/badge-removable'
import { Button } from '../../components/button'
import { Control } from '../../components/control'
import { useFileUploadHandlers } from '../../components/file-upload/use-file-upload-handlers'
import { Icon } from '../../components/icon'
import { Textarea } from '../../components/textarea'
import { ariaAttr } from '../../core/aria-attr'
import { dataAttr } from '../../core/data-attr'
import { ArrowUp, Paperclip, Square } from '../../primitives/icons/icons'
import { defineMessages } from '../../primitives/intl/intl-messages'
import { useIntl } from '../../primitives/intl/use-intl'
import { isComposing } from '../../utilities/is-composing'
import { keyByOccurrence } from '../../utilities/key-by-occurrence'
import { hasBrowserModifier } from '../../utilities/modifier-keys'
import { ChatPromptPicker } from './chat-prompt-picker'
import type { ChatCitation } from './engine/chat-content/types'
import { canSubmitDraft } from './engine/chat-draft/content'
import {
	type DraftHistory,
	isHistoryInput,
	recallDraft,
	rememberDraft,
} from './engine/chat-draft/history'
import { rebaseCitations } from './engine/chat-draft/rebase'
import type { ChatPromptSource } from './types'
import { useChatPromptPicker } from './use-chat-prompt-picker'

const messages = defineMessages({
	placeholder: {
		id: 'ui.chat.placeholder',
		defaultMessage: 'Ask anything',
		description: 'The hint text of the empty field where the reader writes a chat message.',
	},
	prompt: {
		id: 'ui.chat.prompt',
		defaultMessage: 'Message',
		description: 'The name of the field where the reader writes a chat message.',
	},
	attach: {
		id: 'ui.chat.attach',
		defaultMessage: 'Add attachment',
		description:
			'The name of the button that opens a file picker to attach files to a chat message.',
	},
	stop: {
		id: 'ui.chat.stop',
		defaultMessage: 'Stop generating',
		description: 'The name of the button that stops the reply that the assistant writes.',
	},
	send: {
		id: 'ui.chat.send',
		defaultMessage: 'Send message',
		description: 'The name of the button that sends a chat message.',
	},
})

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
	/**
	 * The citations of `value`: phrases that the app or a picker constructed,
	 * such as a dataset that scopes the question. {@link useChatDraft} holds
	 * them beside the value.
	 *
	 * @remarks
	 * The composer moves each citation across a change of the text, and reads
	 * the caret to find where the change is. A change that touches a citation
	 * dissolves it, and its text stays as prose. No change of the text makes a
	 * citation, so a pasted or typed `@name` is prose. An undo or a redo of the
	 * browser brings back the citations of the draft that it restores.
	 * @defaultValue []
	 */
	citations?: readonly ChatCitation[]
	/**
	 * Fires when the user types, with the next value and the citations of that
	 * value.
	 */
	onValueChange: (value: string, citations: readonly ChatCitation[]) => void
	/**
	 * The sources that a trigger character opens a picker over, such as `@` for
	 * datasets and `/` for commands. A choice puts a citation in the draft, and
	 * `onValueChange` gives it.
	 *
	 * @remarks
	 * A trigger counts at the start of the draft or after whitespace, and the
	 * text from the trigger to the caret is the query. The picker sits over the
	 * composer. ArrowUp and ArrowDown move the highlight, Enter or Tab chooses,
	 * and Escape closes the picker for that trigger. The textarea keeps the
	 * focus, and the options are its active descendant.
	 *
	 * Hoist the list out of the render, as a module constant or a `useMemo`.
	 */
	sources?: readonly ChatPromptSource[]
	/** Fires when the user submits (Enter without Shift, or the send button). */
	onSubmit: () => void
	/** Fires when the user stops a streaming response: the stop button, or Enter while `streaming`. */
	onStop?: () => void
	/**
	 * Renders the send button as a stop button that calls `onStop`.
	 *
	 * @defaultValue false
	 */
	streaming?: boolean
	/**
	 * The hint text that the empty textarea shows. It is not an accessible name.
	 * @defaultValue `'Ask anything'`, in the language of the reader.
	 */
	placeholder?: string
	/**
	 * The minimum height of the textarea, in lines. The textarea grows with its
	 * content past this height.
	 * @defaultValue 2
	 */
	rows?: number
	/**
	 * Makes send inert without disabling the textarea. The send button is
	 * `aria-disabled` and stays focusable, as it is for an empty draft.
	 * @defaultValue false
	 */
	disabled?: boolean
	/**
	 * Fires when the user selects attachments, with the selected files. The
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
	/**
	 * Fires when the user clicks the remove button of an attachment, with the
	 * index of that attachment. The textarea then takes the focus (WCAG 2.4.3).
	 */
	onRemoveAttachment?: (index: number) => void
	/**
	 * Extra controls, such as a model picker or a slash-command trigger. They
	 * render at the start of the action row, before the paperclip and send.
	 */
	actions?: ReactNode
	className?: string
	/** Ref to the underlying textarea (e.g. to focus the composer imperatively). */
	ref?: Ref<HTMLTextAreaElement>
	/**
	 * Accessible name for the composer. A placeholder is not an accessible name;
	 * the textarea defaults to `"Message"` when neither this nor
	 * `aria-labelledby` is supplied (WCAG 3.3.2 / 4.1.2). Pass `aria-labelledby`
	 * instead to point at a visible label.
	 * @defaultValue `'Message'`, in the language of the reader.
	 */
	'aria-label'?: string
	/** Points at a visible label for the composer, in place of `aria-label`. */
	'aria-labelledby'?: string
}

/**
 * Auto-resizing chat composer built on Textarea and wrapped in a `<Control>` so
 * the textarea carries an inherent, stable id. Submits on Enter (Shift+Enter for
 * newlines), and toggles its send button to a stop control while `streaming`.
 * While `streaming`, Enter calls `onStop` and does not submit. It offers a
 * paperclip file picker when `onAttach` is provided, and surfaces
 * `attachments` as removable chips below the field. The action row (extra
 * `actions`, the paperclip, and send or stop) sits below the textarea, at the
 * inline end of the row.
 *
 * A send button that cannot send, such as for an empty draft, is
 * `aria-disabled` and ignores the press. It is not natively disabled, so it
 * keeps the focus when a send or a stop empties the draft.
 */
export function ChatPrompt({
	value,
	citations = [],
	onValueChange,
	sources,
	onSubmit,
	onStop,
	streaming = false,
	placeholder,
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
	const intl = useIntl()

	const canSubmit = !disabled && canSubmitDraft(value)

	const { inputRef, openPicker, handleChange } = useFileUploadHandlers({ onAccept: onAttach })

	const textareaRef = useRef<HTMLTextAreaElement>(null)

	// The citations of each draft that the composer showed, so that an undo or a
	// redo of the browser brings them back with their text.
	const historyRef = useRef<DraftHistory>(new Map())

	useLayoutEffect(() => {
		rememberDraft(historyRef.current, value, citations)
	}, [value, citations])

	const setTextareaRefs = useComposedRefs(textareaRef, ref)

	// The composer always gets an accessible name (WCAG 3.3.2 / 4.1.2):
	// aria-labelledby wins over aria-label; falls back to 'Message'.
	const labelProps = ariaLabelledBy
		? { 'aria-labelledby': ariaLabelledBy }
		: { 'aria-label': ariaLabel ?? intl.formatMessage(messages.prompt) }

	const picker = useChatPromptPicker({ sources, value, citations, textareaRef, onValueChange })

	const { onKeyDown: pickerKeyDown } = picker

	const handleKeyDown = useCallback(
		(event: KeyboardEvent<HTMLTextAreaElement>) => {
			// The open picker takes its keys first: Enter chooses and does not send.
			if (pickerKeyDown(event)) return

			deleteWholeCitation(event, citations)

			if (event.key !== 'Enter' || event.shiftKey || isComposing(event)) return

			event.preventDefault()

			if (streaming) {
				onStop?.()
			} else if (canSubmit) {
				onSubmit()
			}
		},
		[streaming, canSubmit, onSubmit, onStop, pickerKeyDown, citations],
	)

	// A textbox cannot take the `combobox` role, so it names its popup with the attributes that a textbox takes.
	const pickerProps = sources
		? {
				'aria-autocomplete': 'list' as const,
				'aria-haspopup': 'listbox' as const,
				'aria-controls': picker.open ? picker.listId : undefined,
			}
		: undefined

	return (
		// Control supplies the stable id the textarea resolves through useControlProps.
		<Control className={className}>
			<Textarea
				ref={setTextareaRefs}
				data-slot="chat-prompt"
				value={value}
				onChange={(event) => {
					const next = event.target.value

					onValueChange(
						next,
						recallOnHistory(event, historyRef.current) ??
							rebaseCitations(value, next, citations, event.target.selectionEnd),
					)

					picker.trackCaret(event.target)
				}}
				onSelect={(event) => picker.trackCaret(event.currentTarget)}
				onFocus={(event) => picker.trackCaret(event.currentTarget)}
				onBlur={picker.forgetCaret}
				onKeyDown={handleKeyDown}
				{...pickerProps}
				autoResize
				rows={rows}
				placeholder={placeholder ?? intl.formatMessage(messages.placeholder)}
				{...labelProps}
				className="max-h-64"
				actions={
					<>
						{actions}
						{onAttach && (
							<>
								{/* Sibling of the button, not nested inside it: a focusable
								    `<input>` inside an interactive control produces
								    nested-interactive markup. The Button is the one control.
								    The input is `hidden`, so browse mode does not read a
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
									aria-label={intl.formatMessage(messages.attach)}
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
								aria-label={intl.formatMessage(messages.stop)}
								onClick={() => onStop?.()}
							>
								<Icon icon={<Square />} />
							</Button>
						) : (
							// One node holds the stop and the send button, so the button that has the
							// focus turns into send when the stream ends. A native `disabled` drops
							// the focus to the body, so send is `aria-disabled` and ignores the press.
							<Button
								type="button"
								color="blue"
								aria-label={intl.formatMessage(messages.send)}
								aria-disabled={ariaAttr(!canSubmit)}
								data-disabled={dataAttr(!canSubmit)}
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
					{/* The consumer owns the list, and it can hold one file two times, such
					    as when the user picks the same file again. The name, the date, and
					    the size do not make a unique key, so a repeat gets its occurrence. */}
					{keyByOccurrence(
						attachments.map((file) => `${file.name}-${file.lastModified}-${file.size}`),
					).map(({ key }, index) => {
						const file = attachments[index]

						if (file === undefined) return null

						return (
							// `flex` keeps the line box of the item off the height of the chip, and
							// `max-w-full` holds a long name to the row, so the chip truncates it.
							<li key={key} className="flex max-w-full">
								<BadgeRemovable
									label={file.name}
									onRemove={
										onRemoveAttachment &&
										(() => {
											onRemoveAttachment(index)

											// Returns focus to the textarea after chip removal (WCAG 2.4.3).
											textareaRef.current?.focus()
										})
									}
								/>
							</li>
						)
					})}
				</ul>
			)}
			{sources && (
				<ChatPromptPicker
					open={picker.open}
					listId={picker.listId}
					listRef={picker.listRef}
					source={picker.source}
					items={picker.items}
					status={picker.status}
					floatingStyles={picker.floating.floatingStyles}
					setFloating={picker.floating.refs.setFloating}
					getFloatingProps={picker.floating.getFloatingProps}
					onChoose={picker.choose}
				/>
			)}
		</Control>
	)
}

/**
 * The citations that an undo or a redo of the browser brings back, or
 * `undefined` for any other change, which the rebase handles. Only an undo or a
 * redo reads the history, so a typed value never brings a citation back.
 *
 * @internal
 */
function recallOnHistory(
	event: ChangeEvent<HTMLTextAreaElement>,
	history: DraftHistory,
): readonly ChatCitation[] | undefined {
	const { inputType } = event.nativeEvent as Partial<InputEvent>

	return isHistoryInput(inputType) ? recallDraft(history, event.target.value) : undefined
}

/**
 * Deletes a whole citation on a Backspace at its end, or on a Delete at its
 * start. The handler selects the citation, and the native delete then removes
 * the selection. Thus the delete is on the undo stack of the browser, and the
 * citation goes as one unit, as it came in as one choice.
 *
 * @internal
 */
function deleteWholeCitation(
	event: KeyboardEvent<HTMLTextAreaElement>,
	citations: readonly ChatCitation[],
): void {
	if (event.key !== 'Backspace' && event.key !== 'Delete') return

	if (hasBrowserModifier(event) || event.shiftKey || isComposing(event)) return

	const textarea = event.currentTarget

	const at = textarea.selectionStart

	if (at !== textarea.selectionEnd) return

	const citation = citations.find((c) => (event.key === 'Backspace' ? c.end : c.start) === at)

	if (citation) textarea.setSelectionRange(citation.start, citation.end)
}
