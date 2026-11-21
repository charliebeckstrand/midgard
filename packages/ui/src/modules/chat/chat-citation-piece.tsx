'use client'

import { type ReactNode, useId } from 'react'
import type { MarkdownRangePiece } from '../../components/markdown/markdown-ranges'
import { dataAttr } from '../../core/data-attr'
import { defineMessages } from '../../primitives/intl/intl-messages'
import { useIntl } from '../../primitives/intl/use-intl'
import { k } from '../../recipes/kata/chat-message'
import { useChatCitations } from './context'
import type { ChatCitation } from './engine/chat-content/types'

const messages = defineMessages<{ selects: { label: string } }>({
	selects: {
		id: 'ui.chat.citationSelects',
		defaultMessage: 'Selects in {label}',
		description:
			'The description of a phrase of a chat reply that selects items in a view beside the chat. The label is the name of the view, such as "Late stops by day".',
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
 * One piece of a citation. Piece 0 is a toggle button whose name is its own
 * text and whose description names the view. A citation that crosses bold
 * draws more pieces. They are visible text with the look of the citation and
 * no control, so that one citation is one tab stop. A piece is not hidden from
 * a screen reader, because it is part of the phrase.
 *
 * @internal
 */
export function ChatCitationPiece({ piece: { range, index }, children }: ChatCitationPieceProps) {
	const { targets, cited, onCite } = useChatCitations()

	const intl = useIntl()

	const description = useId()

	const pressed = cited?.id === range.id

	if (index > 0) {
		return (
			<span
				data-slot="chat-citation-piece"
				data-pressed={dataAttr(pressed)}
				className={k().citation}
			>
				{children}
			</span>
		)
	}

	const label = targets[range.target]?.label ?? range.target

	return (
		<>
			<button
				type="button"
				data-slot="chat-citation"
				data-pressed={dataAttr(pressed)}
				aria-pressed={pressed}
				aria-describedby={description}
				className={k().citation}
				onClick={() => onCite?.(pressed ? null : range)}
			>
				{children}
			</button>
			{/* Outside the button, so that it is not part of the name. `hidden`, so that browse mode does not read it in the prose. */}
			<span id={description} hidden>
				{intl.formatMessage(messages.selects, { label })}
			</span>
		</>
	)
}
