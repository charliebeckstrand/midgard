'use client'

import { useEffect } from 'react'
import { useChatMessages } from '../hooks/use-chat-messages'
import { useScrollToBottom } from '../hooks/use-scroll-to-bottom'
import type { ChatMessage } from '../types'
import { ChatInput } from './chat-input'
import { Message } from './message'

interface Props {
	chatId: string
	initialMessages: ChatMessage[]
	isDraft: boolean
}

export function ChatView({ chatId, initialMessages, isDraft: initialIsDraft }: Props) {
	const { messages, sending, isDraft, sendMessage } = useChatMessages(
		chatId,
		initialMessages,
		initialIsDraft,
	)

	const { ref: messagesEndRef, scrollToBottom } = useScrollToBottom()

	useEffect(() => {
		if (messages.length > 0) {
			scrollToBottom()
		}
	}, [messages, scrollToBottom])

	return (
		<div className="flex h-full justify-center">
			<div className="flex flex-col h-full max-w-4xl flex-1 justify-center">
				{!isDraft && (
					<div className="flex-1 grow overflow-y-auto p-4">
						{messages.length > 0 && (
							<div className="mx-auto space-y-4">
								{messages.map((message) => (
									<Message key={message.id} role={message.role} content={message.content} />
								))}
								<div ref={messagesEndRef} />
							</div>
						)}
					</div>
				)}

				<ChatInput onSend={sendMessage} disabled={sending} />
			</div>
		</div>
	)
}
