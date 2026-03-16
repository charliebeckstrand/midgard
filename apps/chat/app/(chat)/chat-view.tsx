'use client'

import type { ChatContent } from 'sindri/chat'
import { ChatLayout, useSendMessage } from 'sindri/chat'
import { useChatContext } from './context'

interface Props {
	chatId: string
	initialMessages: ChatContent[]
	isDraft: boolean
}

export function ChatView({ chatId, initialMessages, isDraft }: Props) {
	const { refreshChats } = useChatContext()

	const {
		messages,
		sending,
		isDraft: draft,
		sendMessage,
	} = useSendMessage(chatId, initialMessages, isDraft, {
		onChatCreated: refreshChats,
	})

	return (
		<div className="h-full w-full max-w-5xl mx-auto">
			<ChatLayout messages={messages} sending={sending} isDraft={draft} onSend={sendMessage} />
		</div>
	)
}
