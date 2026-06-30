import { memo, type ReactNode } from 'react'
import { Markdown } from '../../components/markdown'
import { cn } from '../../core'
import { type ChatMessageVariants, k } from '../../recipes/kata/chat-message'

/** Props for {@link ChatMessage}. */
export type ChatMessageProps = ChatMessageVariants & {
	/** Wall-clock label shown below the bubble. */
	timestamp?: ReactNode
	/** Pulses the bubble content while a response streams in. */
	streaming?: boolean
	/** Action rail below the bubble (copy, retry, edit, …). */
	actions?: ReactNode
	className?: string
	/** Message text, rendered as GitHub-flavored Markdown. */
	children: string
}

/**
 * Conversational message bubble sided and colored by `type` (`user`,
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
 * system bubble — in both light and dark mode. While `streaming`, the content
 * pulses (`animate-pulse`) to signal the response is still arriving, settling
 * to a steady bubble the moment streaming ends.
 *
 * Memoized on its (shallow-equal) props, so a transcript's settled bubbles skip
 * re-rendering — and re-lexing their Markdown — while only the streaming
 * bubble's `children` actually changes from chunk to chunk.
 */
export const ChatMessage = memo(function ChatMessage({
	type,
	timestamp,
	streaming,
	actions,
	className,
	children,
}: ChatMessageProps) {
	// Bubble side/color alone convey the speaker visually; a visually hidden
	// author label names it for assistive technology. System messages are status
	// lines, not an utterance; they get a plain "System" attribution.
	const resolvedType = type ?? 'assistant'

	const author =
		resolvedType === 'user' ? 'You said' : resolvedType === 'system' ? 'System' : 'Assistant said'

	return (
		<div data-slot="chat-message" data-type={resolvedType} className={cn(k({ type }), className)}>
			<div data-slot="chat-message-bubble" className={cn(k.bubble({ type }))}>
				<span data-slot="chat-message-author" className="sr-only">
					{author}:{' '}
				</span>
				<Markdown className={streaming ? 'animate-pulse' : ''}>{children}</Markdown>
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
