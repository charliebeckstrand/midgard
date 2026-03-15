import { bifrost, getUser } from 'heimdall'
import type { ReactNode } from 'react'
import { ChatClient } from './client'
import type { Chat } from './types'

async function fetchChats(): Promise<Chat[]> {
	const res = await bifrost('/api/chat').catch(() => null)

	if (!res?.ok) return []

	return res.json()
}

export default async function ChatLayout({ children }: { children: ReactNode }) {
	const [{ user }, chats] = await Promise.all([getUser(), fetchChats()])

	return (
		<ChatClient user={user} chats={chats}>
			{children}
		</ChatClient>
	)
}
