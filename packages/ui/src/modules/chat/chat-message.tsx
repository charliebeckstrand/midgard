import { memo, type ReactNode } from 'react'
import { Markdown } from '../../components/markdown'
import { cn } from '../../core'
import { type ChatMessageVariants, k } from '../../recipes/kata/chat-message'
import { ChatEmbed } from './chat-embed'
import type { ChatPart } from './engine/chat-content/types'

/**
 * One block of a message. The switch holds every kind, so a kind added later
 * cannot reach the bubble undrawn — the compiler asks for its arm, as it does
 * for the projection and the emptiness rule.
 *
 * A text block lexes on its own rather than joined to its neighbours. Each
 * `Markdown` is then memoized on its own string, so a settled block above a
 * streaming one skips its re-lex on every chunk.
 *
 * @internal
 */
function ChatMessageBlock({ part, className }: { part: ChatPart; className?: string }) {
	switch (part.kind) {
		case 'text':
			return <Markdown className={className}>{part.text}</Markdown>
		case 'embed':
			return <ChatEmbed part={part} className={className} />
	}
}

/** Props for {@link ChatMessage}. */
export type ChatMessageProps = ChatMessageVariants & {
	/** Wall-clock label shown below the bubble. */
	timestamp?: ReactNode
	/** Pulses the bubble content and shows the progress cursor, while a response streams in. */
	streaming?: boolean
	/** Action rail below the bubble (copy, retry, edit, …). */
	actions?: ReactNode
	className?: string
	/**
	 * Message content, rendered as GitHub-flavored Markdown: prose, or the blocks
	 * it is built from.
	 */
	children: string | ChatPart[]
}

/**
 * Conversational message bubble sided and colored by `role` (`user`,
 * `assistant`, or `system`; defaults to `assistant`), with an optional
 * `timestamp`, `actions` rail, and a `streaming` pulse over its content.
 *
 * @remarks
 * Side and color alone convey the speaker visually, so a visually hidden author
 * label ("You said", "Assistant said", or "System") announces it to assistive
 * tech.
 *
 * Content renders as GitHub-flavored Markdown ({@link Markdown}, complete with
 * syntax-highlighted code fences). {@link Markdown} sets no color of its own,
 * so the prose inherits the bubble's foreground for free — white on the user
 * bubble's blue fill, the default tone on the assistant bubble, muted on the
 * system bubble — in both light and dark mode. While `streaming`, the bubble
 * takes the progress cursor and projects a pulse onto that prose, settling to a
 * steady bubble the moment streaming ends. The kata holds the whole look.
 *
 * A part list draws one block per part, each keyed by the part's own id: a text
 * block is its own {@link Markdown}, and an `embed` block is whatever renderer
 * {@link ChatEmbedProvider} registered under its name. The string arm still
 * draws exactly one {@link Markdown} over the string itself, so a transcript of
 * prose allocates nothing per render and lexes once, as it did before parts
 * existed.
 *
 * The pulse rides each drawn {@link Markdown}, so a streaming reply that has
 * already landed a chart pulses its prose and leaves the chart steady.
 *
 * Memoized on its (shallow-equal) props, so a transcript's settled bubbles skip
 * re-rendering — and re-lexing their Markdown — while only the streaming
 * bubble's `children` actually changes from chunk to chunk.
 */
export const ChatMessage = memo(function ChatMessage({
	role,
	timestamp,
	streaming,
	actions,
	className,
	children,
}: ChatMessageProps) {
	// Bubble side/color alone convey the speaker visually; a visually hidden
	// author label names it for assistive technology. System messages are status
	// lines, not an utterance; they get a plain "System" attribution.
	const resolvedRole = role ?? 'assistant'

	const author =
		resolvedRole === 'user' ? 'You said' : resolvedRole === 'system' ? 'System' : 'Assistant said'

	return (
		<div data-slot="chat-message" data-role={resolvedRole} className={cn(k({ role }), className)}>
			<div data-slot="chat-message-bubble" className={cn(k.bubble({ role, streaming }))}>
				<span data-slot="chat-message-author" className="sr-only">
					{author}:{' '}
				</span>
				{typeof children === 'string' ? (
					<Markdown>{children}</Markdown>
				) : (
					children.map((part, index) => (
						<ChatMessageBlock
							key={part.id}
							part={part}
							className={index === 0 ? undefined : cn(k.part)}
						/>
					))
				)}
			</div>
			{timestamp !== undefined && (
				<div data-slot="chat-message-timestamp" className={cn(k.timestamp)}>
					{timestamp}
				</div>
			)}
			{actions !== undefined && (
				<div data-slot="chat-message-actions" className={cn(k.actions)}>
					{actions}
				</div>
			)}
		</div>
	)
})
