'use client'

import { useComposedRefs } from 'motion/react'
import {
	type ChangeEvent,
	type KeyboardEvent,
	type ReactNode,
	type Ref,
	type RefObject,
	useCallback,
	useLayoutEffect,
	useRef,
} from 'react'
import { BadgeRemovable } from '../../components/badge/badge-removable'
import { Button } from '../../components/button'
import { Control } from '../../components/control'
import { ControlContext } from '../../components/control/context'
import { useFileUploadHandlers } from '../../components/file-upload/use-file-upload-handlers'
import { Icon } from '../../components/icon'
import { Textarea } from '../../components/textarea'
import { ariaAttr } from '../../core/aria-attr'
import { dataAttr } from '../../core/data-attr'
import { ArrowUp, Paperclip, Square } from '../../primitives/icons/icons'
import { defineMessages } from '../../primitives/intl/intl-messages'
import { useIntl } from '../../primitives/intl/use-intl'
import { k } from '../../recipes/kata/chat-prompt'
import { isComposing } from '../../utilities/is-composing'
import { keyByOccurrence } from '../../utilities/key-by-occurrence'
import { hasBrowserModifier } from '../../utilities/modifier-keys'
import type { WysiwygHandle } from '../wysiwyg/types'
import { ChatPromptPicker } from './chat-prompt-picker'
import { ChatPromptWysiwyg, type ChatPromptWysiwygOptions } from './chat-prompt-wysiwyg'
import type { ChatCitation } from './engine/chat-content/types'
import { canSubmitDraft } from './engine/chat-draft/content'
import {
	type DraftHistory,
	EMPTY_HISTORY,
	historyStep,
	recordDraft,
	stepDraft,
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
	 * dissolves it, and its text stays as prose. A Backspace at the end of a
	 * citation deletes one character, and the picker of its source opens again
	 * with the rest of the label as the query. No change of the text makes a
	 * citation, so a pasted or typed `@name` is prose. An undo or a redo of the
	 * browser brings back the citations of the draft that it goes to.
	 *
	 * While {@link ChatPromptProps.wysiwyg} is on, the field marks each citation,
	 * and a change that touches one dissolves it, as in the textarea. A
	 * Backspace or a Delete in a citation then deletes one character, and no
	 * picker opens.
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
	 * and Escape closes the picker until the next edit. While the list loads,
	 * Enter and Tab do nothing: no key chooses an item of the last query, Enter
	 * does not send, and Tab does not move the focus. The textarea keeps the
	 * focus, and the options are its active descendant.
	 *
	 * Hoist the list out of the render, as a module constant or a `useMemo`.
	 *
	 * While {@link ChatPromptProps.wysiwyg} is on, the field opens no picker.
	 */
	sources?: readonly ChatPromptSource[]
	/** Fires when the user submits (Enter without Shift, or the send button). */
	onSubmit: () => void
	/**
	 * Fires when the user presses the stop button of a streaming response. Enter
	 * does not stop the response.
	 */
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
	 * Shows the formatting of the draft in the field, in place of its Markdown
	 * syntax, with a formatting toolbar above the field. `true` shows each
	 * action, and `{ actions }` picks them. The value stays a Markdown string.
	 *
	 * @remarks The field is a {@link Wysiwyg}. Enter sends, and Shift+Enter
	 * starts a new block, continues a list, or adds a line to a code block. On an
	 * empty last line of a code block, Shift+Enter leaves the block. A press
	 * on a toolbar button keeps the focus in the field. The editor loads after
	 * the mount, and until then the field shows the draft as text.
	 *
	 * While it is on, the field keeps the citations of the draft as marks, and
	 * opens no picker for `sources`.
	 * @defaultValue false
	 */
	wysiwyg?: boolean | ChatPromptWysiwygOptions
	/**
	 * A row above the field, such as a status that says that the draft edits a
	 * sent message, or that a reply streams, with its controls. Render it only
	 * while its status holds: `undefined`, `null`, or `false` renders no row.
	 * Content that unmounts while the focus is in it,
	 * such as after a press of its Cancel button, gives the focus to the
	 * textarea (WCAG 2.4.3). A form control in the row is not part of the
	 * `Control` of the field: it gets its own id, and it takes no `disabled`,
	 * `size`, or `variant` from the composer.
	 */
	toolbar?: ReactNode
	/**
	 * Fires on Escape in the textarea while no picker is open, such as to cancel
	 * an edit. The press is consumed, so an enclosing dialog does not close on it.
	 */
	onEscape?: () => void
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
	/**
	 * Ref to the field, such as to focus the composer imperatively: the
	 * textarea, or the {@link WysiwygHandle} while `wysiwyg` is on.
	 */
	ref?: Ref<HTMLTextAreaElement | WysiwygHandle>
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
	/**
	 * Points at text that describes the composer, such as the status in the
	 * `toolbar`, so a reader who focuses the field hears it.
	 */
	'aria-describedby'?: string
}

/**
 * Auto-resizing chat composer built on Textarea, or on Wysiwyg with
 * `wysiwyg`, and wrapped in a `<Control>` so the field carries an inherent,
 * stable id. Submits on Enter (Shift+Enter for
 * newlines), and toggles its send button to a stop control while `streaming`.
 * While `streaming`, Enter does nothing, and the draft stays. A reader who
 * presses Enter asks to send, so the key does not stop a reply that the
 * reader cannot get back. Only the stop button calls `onStop`. It offers a
 * paperclip file picker when `onAttach` is provided, and surfaces
 * `attachments` as removable chips below the field. The action row (extra
 * `actions`, the paperclip, and send or stop) sits below the textarea, at the
 * inline end of the row.
 *
 * A `toolbar` renders above the field. Escape in the textarea calls
 * `onEscape`, unless an open picker takes the key first.
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
	toolbar,
	onEscape,
	placeholder,
	rows = 2,
	wysiwyg = false,
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
	'aria-describedby': ariaDescribedBy,
}: ChatPromptProps) {
	const intl = useIntl()

	const canSubmit = !disabled && canSubmitDraft(value)

	const { inputRef, openPicker, handleChange } = useFileUploadHandlers({ onAccept: onAttach })

	const textareaRef = useRef<HTMLTextAreaElement>(null)

	// Each draft that the composer showed, in order, so that an undo or a redo of
	// the browser brings back the citations of the draft that it goes to.
	const historyRef = useRef<DraftHistory>(EMPTY_HISTORY)

	useLayoutEffect(() => {
		historyRef.current = recordDraft(historyRef.current, { value, citations })
	}, [value, citations])

	// The field that has the focus calls: the textarea, or the handle of the Wysiwyg.
	const fieldRef = useRef<HTMLTextAreaElement | WysiwygHandle>(null)

	const setTextareaRefs = useComposedRefs(textareaRef, fieldRef, ref)

	const setWysiwygRefs = useComposedRefs(fieldRef, ref)

	const focusField = useCallback(() => fieldRef.current?.focus(), [])

	// The composer always gets an accessible name (WCAG 3.3.2 / 4.1.2):
	// aria-labelledby wins over aria-label; falls back to 'Message'.
	const labelProps = ariaLabelledBy
		? { 'aria-labelledby': ariaLabelledBy }
		: { 'aria-label': ariaLabel ?? intl.formatMessage(messages.prompt) }

	const picker = useChatPromptPicker({ sources, value, citations, textareaRef, onValueChange })

	const { onKeyDown: pickerKeyDown } = picker

	// While a reply streams, Enter keeps the draft for after the reply.
	const send = useCallback(() => {
		if (!streaming && canSubmit) onSubmit()
	}, [streaming, canSubmit, onSubmit])

	const handleKeyDown = useCallback(
		(event: KeyboardEvent<HTMLTextAreaElement>) => {
			// The open picker takes its keys first: Enter chooses and does not send.
			if (pickerKeyDown(event)) return

			// An open picker closes on Escape through its own dismissal, so `onEscape`
			// takes the key only while the picker is closed. The press is then
			// consumed, so an enclosing dialog does not close on it.
			if (event.key === 'Escape' && onEscape && !picker.open && !isComposing(event)) {
				event.preventDefault()

				onEscape()

				return
			}

			deleteWholeCitation(event, citations)

			if (event.key !== 'Enter' || event.shiftKey || isComposing(event)) return

			event.preventDefault()

			send()
		},
		[send, pickerKeyDown, citations, picker.open, onEscape],
	)

	// A textbox cannot take the `combobox` role, so it names its popup with the attributes that a textbox takes.
	const pickerProps = sources
		? {
				'aria-autocomplete': 'list' as const,
				'aria-haspopup': 'listbox' as const,
				'aria-controls': picker.open ? picker.listId : undefined,
			}
		: undefined

	// The row below the field: the extra actions, the paperclip, and send or stop.
	const actionRow = (
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
	)

	return (
		// Control supplies the stable id the field resolves through useControlProps.
		<Control className={className}>
			{/* `editing && …` gives `false`, which renders nothing, so it is no toolbar. */}
			{toolbar != null && typeof toolbar !== 'boolean' && (
				<ChatPromptToolbar onUnmountWithFocus={focusField}>{toolbar}</ChatPromptToolbar>
			)}
			{wysiwyg ? (
				<ChatPromptWysiwyg
					ref={setWysiwygRefs}
					config={wysiwyg}
					value={value}
					ranges={citations}
					onValueChange={onValueChange}
					onEnter={send}
					onEscape={onEscape}
					rows={rows}
					placeholder={placeholder ?? intl.formatMessage(messages.placeholder)}
					{...labelProps}
					aria-describedby={ariaDescribedBy}
					actions={actionRow}
				/>
			) : (
				<Textarea
					ref={setTextareaRefs}
					data-slot="chat-prompt"
					value={value}
					onChange={(event) => {
						const next = event.target.value

						onValueChange(
							next,
							recallOnHistory(event, historyRef) ??
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
					aria-describedby={ariaDescribedBy}
					className="max-h-64"
					actions={actionRow}
				/>
			)}
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

											// Returns focus to the field after chip removal (WCAG 2.4.3).
											focusField()
										})
									}
								/>
							</li>
						)
					})}
				</ul>
			)}
			{sources && !wysiwyg && (
				<ChatPromptPicker
					open={picker.open}
					listId={picker.listId}
					listRef={picker.listRef}
					source={picker.source}
					items={picker.items}
					status={picker.status}
					statusText={picker.statusText}
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
 * The row of the `toolbar` of {@link ChatPrompt}. The cleanup of a layout
 * effect runs before React removes the row, so it still finds the focus in it,
 * and it gives the focus to the textarea. The row is out of the `Control` of
 * the field, so a form control in it does not take the id of the textarea.
 *
 * @internal
 */
function ChatPromptToolbar({
	onUnmountWithFocus,
	children,
}: {
	onUnmountWithFocus: () => void
	children: ReactNode
}) {
	const rowRef = useRef<HTMLDivElement>(null)

	useLayoutEffect(() => {
		const row = rowRef.current

		return () => {
			if (row?.contains(row.ownerDocument.activeElement)) onUnmountWithFocus()
		}
	}, [onUnmountWithFocus])

	return (
		<div ref={rowRef} data-slot="chat-prompt-toolbar" className={k().toolbar}>
			{/* The `Control` of the composer gives its id to the textarea alone. */}
			<ControlContext value={undefined}>{children}</ControlContext>
		</div>
	)
}

/**
 * The citations that an undo or a redo of the browser brings back, or
 * `undefined` for any other change, which the rebase handles. A step moves the
 * cursor of the history to the draft that it goes to. Only an undo or a redo
 * reads the history, so typed text never makes a citation.
 *
 * @internal
 */
function recallOnHistory(
	event: ChangeEvent<HTMLTextAreaElement>,
	historyRef: RefObject<DraftHistory>,
): readonly ChatCitation[] | undefined {
	const step = historyStep((event.nativeEvent as Partial<InputEvent>).inputType)

	if (!step) return undefined

	const found = stepDraft(historyRef.current, event.target.value, step)

	if (!found) return undefined

	historyRef.current = found.history

	return found.citations
}

/**
 * Deletes a whole citation on a Delete at its start. The handler selects the
 * citation, and the native delete then removes the selection. Thus the
 * delete is on the undo stack of the browser, and the citation goes as one
 * unit, as it came in as one choice.
 *
 * A choice puts a space after the quote. The delete also removes that space
 * when whitespace or the start of the draft is before the citation. Thus
 * `a @X b` becomes `a b`, and no double space stays. A citation with a word
 * directly before it keeps the space, so the two words do not join.
 *
 * @internal
 */
function deleteWholeCitation(
	event: KeyboardEvent<HTMLTextAreaElement>,
	citations: readonly ChatCitation[],
): void {
	// A Backspace deletes one character, and the picker opens again at the trigger.
	if (event.key !== 'Delete') return

	if (hasBrowserModifier(event) || event.shiftKey || isComposing(event)) return

	const textarea = event.currentTarget

	const at = textarea.selectionStart

	if (at !== textarea.selectionEnd) return

	const citation = citations.find((c) => c.start === at)

	if (!citation) return

	const { value } = textarea

	const before = value[citation.start - 1]

	const spaced = value[citation.end] === ' ' && (before === undefined || /\s/.test(before))

	textarea.setSelectionRange(citation.start, spaced ? citation.end + 1 : citation.end)
}
