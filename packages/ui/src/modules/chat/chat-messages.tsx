'use client'

import { cn } from '../../core'
import { ChatMessage } from './chat-message'
import type { ChatContent } from './types'
import { useChatScroll } from './use-chat-scroll'

/** Props for {@link ChatMessages}. */
export type ChatMessagesProps = {
	/** The transcript, oldest first. */
	messages: ChatContent[]
	/** Whether a reply is currently streaming; pulses the latest agent bubble. */
	streaming?: boolean
	className?: string
}

/**
 * Renders a chat transcript and auto-scrolls to the newest message.
 *
 * @remarks
 * Maps each message's `role` to the `ChatMessage` `type` (`agent` →
 * `assistant`). When `streaming`, only the last agent bubble pulses. Scrolls
 * to the bottom on every `messages` change via {@link useChatScroll}, so
 * streamed chunks stay in view.
 */
export function ChatMessages({ messages, streaming, className }: ChatMessagesProps) {
	const { ref } = useChatScroll(messages)

	return (
		<div data-slot="chat-messages" className={cn('flex-1 grow overflow-y-auto min-h-0', className)}>
			{messages.length > 0 && (
				<>
					<div className="flex flex-col gap-6 mx-auto">
						{messages.map((message, index) => (
							<ChatMessage
								key={message.id ?? index}
								type={message.role === 'user' ? 'user' : 'assistant'}
								streaming={streaming && message.role === 'agent' && index === messages.length - 1}
							>
								{message.content}
							</ChatMessage>
						))}
					</div>
					<div ref={ref} />
				</>
			)}
		</div>
	)
}
