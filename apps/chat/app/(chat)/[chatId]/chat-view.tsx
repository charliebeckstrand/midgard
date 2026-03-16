'use client'

import type { ChatContent } from 'sindri/chat'
import { ChatLayout, useChat } from 'sindri/chat'

interface Props {
	chatId: string
	initialMessages: ChatContent[]
	isDraft: boolean
}

export function ChatView({ chatId, initialMessages, isDraft: initialIsDraft }: Props) {
	const { messages, sending, isDraft, sendMessage } = useChat(
		chatId,
		initialMessages,
		initialIsDraft,
	)

	return <ChatLayout messages={messages} sending={sending} isDraft={isDraft} onSend={sendMessage} />
}
