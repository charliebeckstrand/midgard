import type { ReactNode } from 'react'
import { cn } from '../../core'
import { type ChatMessageVariants, k } from '../../recipes/kata/chat-message'

export type ChatMessageProps = ChatMessageVariants & {
	/** Wall-clock label shown below the bubble. */
	timestamp?: ReactNode
	/** Shows a blinking cursor glyph at the end of the bubble for streaming responses. */
	streaming?: boolean
	/** Action rail below the bubble (copy, retry, edit, …). */
	actions?: ReactNode
	className?: string
	children?: ReactNode
}

/**
 * Conversational message bubble sided and colored by `type` (`user` or
 * `assistant`) — with an optional `timestamp`, `actions` rail, and a blinking
 * `streaming` cursor. Speaker is announced to assistive tech via a visually
 * hidden author label.
 */
export function ChatMessage({
	type,
	timestamp,
	streaming,
	actions,
	className,
	children,
}: ChatMessageProps) {
	// Speaker is conveyed visually by bubble side/color only; name it for AT so a
	// screen reader can attribute each message.
	const author = (type ?? 'assistant') === 'user' ? 'You said' : 'Assistant said'

	return (
		<div
			data-slot="chat-message"
			data-type={type ?? 'assistant'}
			className={cn(k({ type }), className)}
		>
			<div data-slot="chat-message-bubble" className={cn(k.bubble({ type }))}>
				<span data-slot="chat-message-author" className="sr-only">
					{author}:{' '}
				</span>
				{children}
				{streaming && <span data-slot="chat-message-cursor" aria-hidden className={cn(k.cursor)} />}
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
