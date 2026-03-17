import { bifrost } from 'heimdall'

import type { ChatContent } from 'sindri/chat'
import { ChatView } from '../chat-view'

async function getChatHistory(chatId: string): Promise<ChatContent[]> {
	const res = await bifrost(`/api/chat/${chatId}`).catch(() => null)

	if (!res?.ok) return []

	const { messages } = await res.json()

	return messages ?? []
}

export default async function ChatPage({
	params,
	searchParams,
}: {
	params: Promise<{ chatId: string }>
	searchParams: Promise<{ draft?: string }>
}) {
	const { chatId } = await params
	const { draft } = await searchParams

	const isDraft = Boolean(draft)

	const initialMessages = isDraft ? [] : await getChatHistory(chatId)

	return <ChatView chatId={chatId} initialMessages={initialMessages} isDraft={isDraft} />
}
