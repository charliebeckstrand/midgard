'use client'

import { type KeyboardEvent, type ReactNode, useId } from 'react'
import type { MarkdownRangePiece } from '../../components/markdown/markdown-ranges'
import { useMarkdownRangeText } from '../../components/markdown/use-markdown-range-text'
import { dataAttr } from '../../core/data-attr'
import { defineMessages } from '../../primitives/intl/intl-messages'
import { useIntl } from '../../primitives/intl/use-intl'
import { k } from '../../recipes/kata/chat-message'
import { useChatCitations } from './context'
import type { ChatCitation } from './engine/chat-content/types'

const messages = defineMessages<{ selects: { label: string }; marked: { label: string } }>({
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
 * One piece of a citation. Piece 0 is a toggle button whose name is the text
 * of the whole citation and whose description names the view. A citation that crosses bold
 * draws more pieces. They are visible text with the look of the citation and
 * no control, so that one citation is one tab stop. A piece is not hidden from
 * a screen reader, because it is part of the phrase.
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
 * A citation whose `target` no provider registers selects in no view. Each of
 * its pieces is static text with no control, such as a dataset that a reader
 * chose to scope a question.
 *
 * @internal
 */
export function ChatCitationPiece({ piece: { range, index }, children }: ChatCitationPieceProps) {
	const { targets, cited, onCite, isMarked } = useChatCitations()

	const intl = useIntl()

	const description = useId()

	// Piece 0 holds only its own text. A citation that crosses bold draws more
	// pieces, so the button takes the text of all of them as its name.
	const name = useMarkdownRangeText(range)

	const pressed = cited?.id === range.id

	if (!Object.hasOwn(targets, range.target)) {
		return (
			<span data-slot="chat-citation-static" className={k().citationStatic}>
				{children}
			</span>
		)
	}

	const marked = isMarked?.(range) ?? false

	if (index > 0) {
		return (
			<span
				data-slot="chat-citation-piece"
				data-pressed={dataAttr(pressed)}
				data-marked={dataAttr(marked)}
				className={k().citation}
			>
				{children}
			</span>
		)
	}

	// The target is registered, so a label is there. The target is an address
	// and is never read, so a piece with no label gets no description.
	const label = targets[range.target]?.label

	const press = () => onCite?.(pressed ? null : range)

	return (
		<>
			{/* biome-ignore lint/a11y/useSemanticElements: a <button> is an atomic inline box, so a citation could not wrap with the prose. */}
			<span
				role="button"
				tabIndex={0}
				data-slot="chat-citation"
				data-pressed={dataAttr(pressed)}
				data-marked={dataAttr(marked)}
				aria-pressed={pressed}
				aria-label={name}
				aria-describedby={label === undefined ? undefined : description}
				className={k().citation}
				onClick={press}
				onKeyDown={(event) => pressKeyDown(event, press)}
				onKeyUp={(event) => {
					if (event.key === ' ') press()
				}}
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
