'use client'

import type { ChatMessage } from 'sindri/chat'
import { ChatLayout } from 'sindri/chat'
import { useChatMessages } from '../hooks/use-chat-messages'

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

	return <ChatLayout messages={messages} sending={sending} isDraft={isDraft} onSend={sendMessage} />
}
