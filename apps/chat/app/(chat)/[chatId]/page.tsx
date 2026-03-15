import { cookies } from 'next/headers'

import { ChatView } from './chat-view'

interface Message {
	role: 'user' | 'agent'
	message: string
}

async function getChatHistory(chatId: string): Promise<Message[]> {
	const cookieStore = await cookies()

	const res = await fetch(
		`${process.env.BIFROST_URL || 'http://localhost:4000'}/api/chat/${chatId}`,
		{ headers: { cookie: cookieStore.toString() } },
	).catch(() => null)

	if (!res?.ok) return []

	const data = await res.json()

	return data.messages ?? []
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

	const isDraft = draft === 'true'

	const initialMessages = isDraft ? [] : await getChatHistory(chatId)

	return <ChatView chatId={chatId} initialMessages={initialMessages} isDraft={isDraft} />
}
