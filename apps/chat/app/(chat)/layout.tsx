import { getUser } from 'heimdall/user'
import { cookies } from 'next/headers'
import type { ReactNode } from 'react'
import { ChatClient } from './client'
import type { Chat } from './types'

async function fetchChats(): Promise<Chat[]> {
	const cookieStore = await cookies()

	const res = await fetch(`${process.env.BIFROST_URL || 'http://localhost:4000'}/api/chat`, {
		headers: { cookie: cookieStore.toString() },
	}).catch(() => null)

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
