'use client'

import type { ReactNode } from 'react'
import { Markdown } from '../../components/markdown'
import type { MarkdownRangePiece } from '../../components/markdown/markdown-ranges'
import { ChatCitationPiece } from './chat-citation-piece'
import { MESSAGE_HEADING_OFFSET } from './chat-tool'
import type { ChatCitation, ChatTextPart } from './engine/chat-content/types'

/**
 * Draws one piece of a citation. A module constant, so that the memo of
 * {@link Markdown} holds.
 *
 * @internal
 */
function renderCitation(piece: MarkdownRangePiece<ChatCitation>, children: ReactNode): ReactNode {
	return <ChatCitationPiece piece={piece}>{children}</ChatCitationPiece>
}

/** Props for {@link ChatCitedText}. @internal */
export type ChatCitedTextProps = {
	/** The text block, with its citations. */
	part: ChatTextPart
	className?: string
}

/**
 * A text block that holds citations. Each citation draws through
 * {@link ChatCitationPiece}. A citation whose `target` a
 * {@link ChatCitationProvider} registers is a control. A citation with no
 * registered target is marked text with no control, so a reader still sees
 * the phrase that scopes a question.
 *
 * @internal
 */
export function ChatCitedText({ part, className }: ChatCitedTextProps) {
	return (
		<Markdown
			className={className}
			headingOffset={MESSAGE_HEADING_OFFSET}
			ranges={part.citations}
			renderRange={renderCitation}
		>
			{part.text}
		</Markdown>
	)
}
