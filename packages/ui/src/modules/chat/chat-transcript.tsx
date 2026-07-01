'use client'

import { cn } from '../../core'
import { ChatMessage } from './chat-message'
import type { ChatContent } from './types'
import { useChatScroll } from './use-chat-scroll'

/** Props for {@link ChatTranscript}. */
export type ChatTranscriptProps = {
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
 * `assistant`). When `streaming`, only the last agent bubble pulses. Opens
 * already scrolled to the bottom (no animation), then smooth-scrolls there on
 * every subsequent `messages` change via {@link useChatScroll}, so streamed
 * chunks stay in view. Mount this fresh per conversation (e.g. `key`d on its
 * id) so switching chats doesn't animate from the old scroll position.
 */
export function ChatTranscript({ messages, streaming, className }: ChatTranscriptProps) {
	const { ref } = useChatScroll(messages)

	return (
		<div
			data-slot="chat-transcript"
			className={cn('flex-1 grow overflow-y-auto min-h-0', className)}
		>
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
