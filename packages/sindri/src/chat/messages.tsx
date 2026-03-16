'use client'

import { useEffect } from 'react'
import { ChatMessage } from './message'
import type { ChatContent } from './types'
import { useScrollToBottom } from './use-scroll-to-bottom'

interface ChatMessagesProps {
	messages: ChatContent[]
}

export function ChatMessages({ messages }: ChatMessagesProps) {
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
								key={message.id || index}
								role={message.role}
								content={message.content}
							/>
						))}
					</div>
					<div ref={messagesEndRef} />
				</>
			)}
		</div>
	)
}
