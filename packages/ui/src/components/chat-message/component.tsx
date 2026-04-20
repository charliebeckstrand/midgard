import { cn } from '../../core'
import {
	type ChatMessageVariants,
	chatMessageBubbleVariants,
	chatMessageVariants,
	k,
} from './variants'

export type ChatMessageProps = ChatMessageVariants & {
	/** Wall-clock label shown below the bubble. */
	timestamp?: React.ReactNode
	/** Shows a blinking cursor glyph at the end of the bubble for streaming responses. */
	streaming?: boolean
	/** Action rail below the bubble (copy, retry, edit, …). */
	actions?: React.ReactNode
	className?: string
	children?: React.ReactNode
}

export function ChatMessage({
	type,
	timestamp,
	streaming,
	actions,
	className,
	children,
}: ChatMessageProps) {
	return (
		<div
			data-slot="chat-message"
			data-type={type ?? 'assistant'}
			className={cn(chatMessageVariants({ type }), className)}
		>
			<div data-slot="chat-message-bubble" className={cn(chatMessageBubbleVariants({ type }))}>
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
