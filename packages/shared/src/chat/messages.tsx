'use client'

import { useEffect } from 'react'
import { ChatMessage } from 'ui/chat-message'
import type { ChatContent } from './types'
import { useScrollToBottom } from './use-scroll-to-bottom'

type ChatMessagesProps = {
	messages: ChatContent[]
	/** Whether a reply is currently streaming; shimmers the latest agent bubble. */
	streaming?: boolean
}

/**
 * Renders a chat transcript and auto-scrolls to the newest message.
 *
 * @remarks
 * Maps `role` to the `ChatMessage` `type` (`agent` → `assistant`). When
 * `streaming`, only the last agent bubble shimmers. Scrolls to bottom on every
 * `messages` change.
 */
export function ChatMessages({ messages, streaming }: ChatMessagesProps) {
	const { ref: messagesEndRef, scrollToBottom } = useScrollToBottom()

	useEffect(() => {
		if (messages.length > 0) {
			scrollToBottom()
		}
	}, [messages, scrollToBottom])

	return (
		<div className="flex-1 grow overflow-y-auto">
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
					<div ref={messagesEndRef} />
				</>
			)}
		</div>
	)
}
