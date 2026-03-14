import { getUser } from 'heimdall/user'
import type { ReactNode } from 'react'
import { ChatClient } from './client'

export default async function ChatLayout({ children }: { children: ReactNode }) {
	const { user } = await getUser()

	return <ChatClient user={user}>{children}</ChatClient>
}
