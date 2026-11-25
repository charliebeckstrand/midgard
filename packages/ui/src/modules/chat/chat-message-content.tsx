import { Markdown } from '../../components/markdown'
import { ChatAction } from './chat-action'
import { ChatCitedText } from './chat-cited-text'
import { MESSAGE_HEADING_OFFSET } from './chat-constants'
import { ChatEmbed } from './chat-embed'
import { ChatTool } from './chat-tool'
import type { ChatPart } from './engine/chat-content/types'

/**
 * One block of a message. The switch holds every kind, so a kind added later
 * cannot reach the bubble undrawn. The compiler asks for its arm, as it does
 * for the projection and the emptiness rule.
 *
 * A text block lexes on its own rather than joined to its neighbors. Each
 * `Markdown` is then memoized on its own string, so a settled block above a
 * streaming one skips its re-lex on every chunk.
 *
 * @internal
 */
function ChatMessageBlock({ part, className }: { part: ChatPart; className?: string }) {
	switch (part.kind) {
		// A block with citations draws through a client leaf, which reads the
		// provider. A block with none stays a static Markdown.
		case 'text':
			return part.citations?.length ? (
				<ChatCitedText part={part} className={className} />
			) : (
				<Markdown className={className} headingOffset={MESSAGE_HEADING_OFFSET}>
					{part.text}
				</Markdown>
			)
		case 'embed':
			return <ChatEmbed part={part} className={className} />
		case 'tool':
			return <ChatTool part={part} className={className} />
		case 'action':
			return <ChatAction part={part} className={className} />
	}
}

/**
 * The content of a message: one {@link Markdown} over a string, or one block
 * per part, each keyed by the id of its part. The bubble and the history of a
 * revised message both draw content through it, so a version draws as the
 * bubble drew it.
 *
 * @internal
 * @param partClassName - The class of each block after the first: the gap
 * between two blocks.
 */
export function ChatMessageContent({
	content,
	partClassName,
}: {
	content: string | ChatPart[]
	partClassName: string
}) {
	if (typeof content === 'string') {
		return <Markdown headingOffset={MESSAGE_HEADING_OFFSET}>{content}</Markdown>
	}

	return content.map((part, index) => (
		<ChatMessageBlock
			key={part.id}
			part={part}
			className={index === 0 ? undefined : partClassName}
		/>
	))
}
