'use client'

import { useRouter } from 'next/navigation'
import { useCallback, useState } from 'react'

import type { ChatMessage, ClientChatMessage } from '../types'

export function useChatMessages(
	chatId: string,
	initialMessages: ChatMessage[],
	initialIsDraft: boolean,
) {
	const router = useRouter()

	const [messages, setMessages] = useState<ClientChatMessage[]>(() =>
		initialMessages.map((m) => ({ ...m, id: crypto.randomUUID() })),
	)

	const [isDraft, setIsDraft] = useState(initialIsDraft)
	const [sending, setSending] = useState(false)

	const sendMessage = useCallback(
		async (content: string) => {
			setSending(true)

			const userMessage: ClientChatMessage = {
				id: crypto.randomUUID(),
				role: 'user',
				content,
			}

			const pendingId = crypto.randomUUID()

			setMessages((prev) => [
				...prev,
				userMessage,
				{ id: pendingId, role: 'agent', content: '', pending: true },
			])

			const allMessages = [...messages, userMessage].map(({ role, content: c }) => ({
				role,
				content: c,
			}))

			const response = await fetch(`/api/chat/${chatId}`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ messages: allMessages }),
			}).catch(() => null)

			if (response?.ok) {
				const data = await response.json()

				setMessages((prev) =>
					prev.map((m) =>
						m.id === pendingId ? { ...m, content: data.content, pending: false } : m,
					),
				)

				if (isDraft) {
					setIsDraft(false)
					router.replace(`/${chatId}`)
					router.refresh()
				}
			} else {
				setMessages((prev) => prev.filter((m) => m.id !== pendingId))
			}

			setSending(false)
		},
		[chatId, isDraft, messages, router],
	)

	return { messages, sending, isDraft, sendMessage }
}
