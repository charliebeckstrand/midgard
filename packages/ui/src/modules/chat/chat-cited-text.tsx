'use client'

import { type ReactNode, useMemo } from 'react'
import { Markdown } from '../../components/markdown'
import type { MarkdownRangePiece } from '../../components/markdown/markdown-ranges'
import { ChatCitationPiece } from './chat-citation-piece'
import { MESSAGE_HEADING_OFFSET } from './chat-tool'
import { useChatCitations } from './context'
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
 * A text block that holds citations. It passes to {@link Markdown} only the
 * citations whose `target` a {@link ChatCitationProvider} registers. A
 * citation with no registered target renders as its prose, with no control,
 * because the phrase is already on the screen. With no provider, the block
 * renders as a text block with no citations does.
 *
 * @internal
 */
export function ChatCitedText({ part, className }: ChatCitedTextProps) {
	const { targets } = useChatCitations()

	const ranges = useMemo(() => {
		const registered = part.citations?.filter((citation) => Object.hasOwn(targets, citation.target))

		return registered?.length ? registered : undefined
	}, [part.citations, targets])

	return (
		<Markdown
			className={className}
			headingOffset={MESSAGE_HEADING_OFFSET}
			ranges={ranges}
			renderRange={renderCitation}
		>
			{part.text}
		</Markdown>
	)
}
