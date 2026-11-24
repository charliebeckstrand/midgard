'use client'

import {
	type FocusEvent,
	type KeyboardEvent,
	type MouseEvent,
	type PointerEvent,
	type ReactNode,
	useEffect,
	useId,
} from 'react'
import type { MarkdownRangePiece } from '../../components/markdown/markdown-ranges'
import { useMarkdownRangeText } from '../../components/markdown/use-markdown-range-text'
import { dataAttr } from '../../core/data-attr'
import { defineMessages } from '../../primitives/intl/intl-messages'
import { useIntl } from '../../primitives/intl/use-intl'
import { k } from '../../recipes/kata/chat-message'
import { useChatCitations } from './context'
import type { ChatCitation } from './engine/chat-content/types'
import { clickCanHover, focusPreviews } from './use-chat-citation-trigger'

const messages = defineMessages<{
	selects: { label: string }
	marked: { label: string }
	shows: { label: string }
}>({
	selects: {
		id: 'ui.chat.citationSelects',
		defaultMessage: 'Selects in {label}',
		description:
			'The description of a phrase of a chat reply that selects items in a view beside the chat. The label is the name of the view, such as "Late stops by day".',
	},
	marked: {
		id: 'ui.chat.citationMarked',
		defaultMessage: 'Selects in {label}. The selection in that view matches it.',
		description:
			'The description of a phrase of a chat reply that selects items in a view beside the chat, while the items that a reader selected in the view match the phrase. The label is the name of the view, such as "Late stops by day".',
	},
	shows: {
		id: 'ui.chat.citationShows',
		defaultMessage: 'Shows {label}',
		description:
			'The description of a phrase of a chat reply that opens a dialog with a view of the data behind the phrase, such as a chart. The label is the name of the view, such as "Late stops by day".',
	},
})

/** Props for {@link ChatCitationPiece}. @internal */
export type ChatCitationPieceProps = {
	/** The piece of the citation, as the Markdown renderer gives it. */
	piece: MarkdownRangePiece<ChatCitation>
	/** The text of the piece. */
	children: ReactNode
}

/**
 * Starts the press of an inline toggle from the keyboard, as a native button
 * does. Enter presses on key down. Space presses on key up, and its key down
 * does not scroll the page.
 *
 * @internal
 */
function pressKeyDown(event: KeyboardEvent<HTMLElement>, press: () => void) {
	if (event.key === 'Enter' && !event.repeat) {
		event.preventDefault()

		press()
	} else if (event.key === ' ') {
		event.preventDefault()
	}
}

/**
 * Whether `node` is in a piece of the citation `id`. A citation that crosses
 * bold draws more pieces, and a pointer that moves from one to the next leaves
 * a piece but stays on the citation.
 *
 * @internal
 */
function inCitation(node: EventTarget | null, id: string): boolean {
	if (!(node instanceof Element)) return false

	return node.closest('[data-citation]')?.getAttribute('data-citation') === id
}

/**
 * One piece of a citation. Piece 0 is a toggle button whose name is the text
 * of the whole citation and whose description names the view. A citation that crosses bold
 * draws more pieces. They are visible text with the look of the citation. A
 * click on one presses the citation, but no key reaches it, so that one
 * citation is one tab stop. These pieces are hidden from a screen reader,
 * because the name of piece 0 already holds their text. Browse mode thus
 * reads the phrase one time.
 *
 * Escape on piece 0 ends a preview and clears `cited`, in each mode.
 *
 * With a trigger that holds `'hover'`, each piece previews the citation while
 * the pointer is on it, and piece 0 previews it while a keyboard focus is on
 * it. The pieces of one citation share a `data-citation` attribute, so a
 * pointer that moves from one piece to the next keeps the preview.
 *
 * Each piece reads `isMarked`, so a citation that the selection of its view
 * matches takes the marked look on each piece. The description of piece 0
 * then says so.
 *
 * Piece 0 is a `span` with the button role and not a `<button>`. A
 * `<button>` is always an atomic inline box, so a citation that wraps at a
 * narrow width moves to a line of its own as a block. A `span` breaks across
 * lines as the prose does.
 *
 * A citation whose target has `render` opens a panel with its view. Piece 0
 * is then a button that opens a dialog (`aria-haspopup`, `aria-expanded`), and
 * its description names the view. A click on any piece, Enter, or Space opens
 * the panel. A hover, a focus, and Escape do nothing, and no piece is pressed
 * or marked, because the citation selects in no view.
 *
 * A citation whose `target` no provider registers selects in no view. Each of
 * its pieces is static text with no control, such as a dataset that a reader
 * chose to scope a question.
 *
 * @internal
 */
export function ChatCitationPiece({ piece: { range, index }, children }: ChatCitationPieceProps) {
	const { targets, cited, isMarked, trigger = 'click', actions, show, shown } = useChatCitations()

	const intl = useIntl()

	const description = useId()

	// Piece 0 holds only its own text. A citation that crosses bold draws more
	// pieces, so the button takes the text of all of them as its name.
	const name = useMarkdownRangeText(range)

	const { id } = range

	// A node that unmounts gets no leave and no blur. Piece 0 thus ends a
	// preview of its citation when it unmounts, as when a reply is replaced, so
	// the app does not keep a preview that no control clears.
	useEffect(() => {
		if (index > 0) return

		return () => actions?.dismiss(id)
	}, [actions, id, index])

	const target = Object.hasOwn(targets, range.target) ? targets[range.target] : undefined

	// A target with `render` opens a panel with its view, and selects in none.
	if (target?.render !== undefined && show !== undefined) {
		return (
			<ChatCitationOpener
				id={range.id}
				index={index}
				name={name}
				label={target.label}
				expanded={shown === range.id}
				onOpen={() => show(range)}
			>
				{children}
			</ChatCitationOpener>
		)
	}

	if (target === undefined || actions === undefined) {
		return (
			<span data-slot="chat-citation-static" className={k().citationStatic}>
				{children}
			</span>
		)
	}

	// The cited citation, and not a preview, is pressed.
	const pressed = cited?.id === range.id

	const marked = isMarked?.(range) ?? false

	// A key cannot hover, so a key presses the citation in each mode, as a tap does.
	const press = () => actions.press(range, false)

	const onClick = (event: MouseEvent<HTMLElement>) => actions.press(range, clickCanHover(event))

	// A click trigger takes no hover, so its pieces get no pointer handlers.
	const hover =
		trigger === 'click'
			? undefined
			: {
					onPointerEnter: (event: PointerEvent<HTMLElement>) => {
						// A touch screen has no hover. A tap presses the citation.
						if (event.pointerType !== 'touch') actions.preview(range, 'pointer')
					},
					onPointerLeave: (event: PointerEvent<HTMLElement>) => {
						// The pointer that moves to the next piece of the citation stays on it.
						if (!inCitation(event.relatedTarget, range.id)) actions.unpreview(range, 'pointer')
					},
				}

	if (index > 0) {
		// A click presses the citation, as a click on piece 0 does. The keys reach
		// piece 0 alone, so the citation stays one tab stop.
		return (
			// biome-ignore lint/a11y/noStaticElementInteractions: piece 0 is the control; this piece only takes the pointer.
			// biome-ignore lint/a11y/useKeyWithClickEvents: piece 0 takes the keys of the citation.
			<span
				data-slot="chat-citation-piece"
				data-citation={range.id}
				// The name of piece 0 holds this text, so a screen reader reads it there.
				aria-hidden="true"
				data-pressed={dataAttr(pressed)}
				data-marked={dataAttr(marked)}
				className={k().citation}
				onClick={onClick}
				{...hover}
			>
				{children}
			</span>
		)
	}

	// The target is an address and is never read, so a piece with no label gets
	// no description.
	const { label } = target

	// A keyboard focus previews the citation, as a hover does. A blur ends the
	// preview, and Escape clears it.
	const focus =
		trigger === 'click'
			? undefined
			: {
					onFocus: (event: FocusEvent<HTMLElement>) => {
						if (focusPreviews(event)) actions.preview(range, 'focus')
					},
					onBlur: () => actions.unpreview(range, 'focus'),
				}

	return (
		<>
			{/* biome-ignore lint/a11y/useSemanticElements: a <button> is an atomic inline box, so a citation could not wrap with the prose. */}
			<span
				role="button"
				tabIndex={0}
				data-slot="chat-citation"
				data-citation={range.id}
				data-pressed={dataAttr(pressed)}
				data-marked={dataAttr(marked)}
				aria-pressed={pressed}
				aria-label={name}
				aria-describedby={label === undefined ? undefined : description}
				className={k().citation}
				onClick={onClick}
				onKeyDown={(event) => {
					if (event.key === 'Escape') {
						// With nothing to clear, Escape goes on to the surface that holds the
						// chat, such as a dialog. `useEscapeLayer` ignores a press whose
						// default is prevented.
						if (actions.clear()) {
							event.preventDefault()

							event.stopPropagation()
						}
					} else {
						pressKeyDown(event, press)
					}
				}}
				onKeyUp={(event) => {
					if (event.key === ' ') press()
				}}
				{...hover}
				{...focus}
			>
				{children}
			</span>
			{/* Outside the button, so that it is not part of the name. `hidden`, so that browse mode does not read it in the prose. */}
			{label === undefined ? null : (
				<span id={description} hidden>
					{intl.formatMessage(marked ? messages.marked : messages.selects, { label })}
				</span>
			)}
		</>
	)
}

/**
 * Piece 0 of the citation `id`. The pieces of a citation are in one block of
 * the prose, so the search goes up from `piece` to the first ancestor that
 * holds piece 0.
 *
 * @internal
 */
function findAnchor(piece: HTMLElement, id: string): HTMLElement | undefined {
	for (let node = piece.parentElement; node !== null; node = node.parentElement) {
		const anchor = Array.from(
			node.querySelectorAll<HTMLElement>('[data-slot="chat-citation"]'),
		).find((item) => item.dataset.citation === id)

		if (anchor !== undefined) return anchor
	}

	return undefined
}

/** Props for {@link ChatCitationOpener}. @internal */
type ChatCitationOpenerProps = {
	/** The id of the citation. */
	id: string
	/** The index of the piece in the citation. */
	index: number
	/** The text of the whole citation, the name of piece 0. */
	name: string | undefined
	/** The label of the target, which names the view. */
	label: string
	/** Whether the panel of this citation is open. */
	expanded: boolean
	/** Opens the panel of the citation. */
	onOpen: () => void
	/** The text of the piece. */
	children: ReactNode
}

/**
 * One piece of a citation whose target has `render`. Piece 0 is a button that
 * opens a dialog, named by the text of the whole citation and described by
 * the view. The pieces after it take a click and no key, and a screen reader
 * does not read them, as for a citation that selects.
 *
 * A press focuses piece 0 before the panel opens, as `DialogTrigger` does. A
 * click in Safari does not focus it, and the panel gives the focus back to the
 * element that had it at the open.
 *
 * @internal
 */
function ChatCitationOpener({
	id,
	index,
	name,
	label,
	expanded,
	onOpen,
	children,
}: ChatCitationOpenerProps) {
	const intl = useIntl()

	const description = useId()

	if (index > 0) {
		return (
			<span
				data-slot="chat-citation-piece"
				data-citation={id}
				// The name of piece 0 holds this text, so a screen reader reads it there.
				aria-hidden="true"
				className={k().citation}
				onClick={(event) => {
					// The panel gives the focus back to the element that had it at the
					// open. This piece cannot take the focus, so piece 0 takes it.
					findAnchor(event.currentTarget, id)?.focus()

					onOpen()
				}}
			>
				{children}
			</span>
		)
	}

	return (
		<>
			{/* biome-ignore lint/a11y/useSemanticElements: a <button> is an atomic inline box, so a citation could not wrap with the prose. */}
			<span
				role="button"
				tabIndex={0}
				data-slot="chat-citation"
				data-citation={id}
				aria-haspopup="dialog"
				aria-expanded={expanded}
				aria-label={name}
				aria-describedby={description}
				className={k().citation}
				onClick={(event) => {
					event.currentTarget.focus()

					onOpen()
				}}
				onKeyDown={(event) => pressKeyDown(event, onOpen)}
				onKeyUp={(event) => {
					if (event.key === ' ') onOpen()
				}}
			>
				{children}
			</span>
			{/* Outside the button, so that it is not part of the name. `hidden`, so that browse mode does not read it in the prose. */}
			<span id={description} hidden>
				{intl.formatMessage(messages.shows, { label })}
			</span>
		</>
	)
}
