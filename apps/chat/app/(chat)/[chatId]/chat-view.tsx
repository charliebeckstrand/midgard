'use client'

import type { ChatContent } from 'sindri/chat'
import { ChatLayout, useSendMessage } from 'sindri/chat'

interface Props {
	chatId: string
	initialMessages: ChatContent[]
	isDraft: boolean
}

export function ChatView({ chatId, initialMessages, isDraft: initialIsDraft }: Props) {
	const { messages, sending, isDraft, sendMessage } = useSendMessage(
		chatId,
		initialMessages,
		initialIsDraft,
	)

	return (
		<div className="h-full w-full max-w-5xl mx-auto">
			<ChatLayout messages={messages} sending={sending} isDraft={isDraft} onSend={sendMessage} />
		</div>
	)
}
