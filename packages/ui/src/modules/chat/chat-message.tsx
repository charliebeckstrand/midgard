import type { ReactNode } from 'react'
import { ShinyText } from '../../components/shiny-text'
import { cn } from '../../core'
import { type ChatMessageVariants, k } from '../../recipes/kata/chat-message'

/** Props for {@link ChatMessage}. */
export type ChatMessageProps = ChatMessageVariants & {
	/** Wall-clock label shown below the bubble. */
	timestamp?: ReactNode
	/** Sweeps a ShinyText shimmer across the bubble content for streaming responses. */
	streaming?: boolean
	/** Action rail below the bubble (copy, retry, edit, …). */
	actions?: ReactNode
	className?: string
	children?: ReactNode
}

/**
 * Conversational message bubble sided and colored by `type` (`user`,
 * `assistant`, or `system`; defaults to `assistant`), with an optional
 * `timestamp`, `actions` rail, and a `streaming` ShinyText shimmer over its
 * content.
 *
 * @remarks
 * Side and color alone convey the speaker visually, so a visually hidden author
 * label ("You said", "Assistant said", or "System") announces it to assistive
 * tech.
 */
export function ChatMessage({
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
				{streaming ? <ShinyText>{children}</ShinyText> : children}
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
}
