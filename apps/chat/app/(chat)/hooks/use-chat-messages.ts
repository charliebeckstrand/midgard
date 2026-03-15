'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

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

	async function sendMessage(content: string) {
		setSending(true)

		const userMessage: ClientChatMessage = {
			id: crypto.randomUUID(),
			role: 'user',
			message: content,
		}

		const pendingId = crypto.randomUUID()

		setMessages((prev) => [
			...prev,
			userMessage,
			{ id: pendingId, role: 'agent', message: '', pending: true },
		])

		const response = await fetch(`/api/chat/${chatId}`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ message: content, role: 'user' }),
		}).catch(() => null)

		if (response?.ok) {
			const data = await response.json()

			if (data.message) {
				setMessages((prev) =>
					prev.map((m) =>
						m.id === pendingId ? { ...m, message: data.message, pending: false } : m,
					),
				)

				await fetch(`/api/chat/${chatId}`, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ message: data.message, role: 'agent' }),
				}).catch(() => null)
			}

			if (isDraft) {
				setIsDraft(false)
				router.replace(`/${chatId}`)
				router.refresh()
			}
		} else {
			setMessages((prev) => prev.filter((m) => m.id !== pendingId))
		}

		setSending(false)
	}

	return { messages, sending, isDraft, sendMessage }
}
