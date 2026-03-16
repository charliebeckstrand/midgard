'use client'

import { EventSourceParserStream } from 'eventsource-parser/stream'
import { usePathname, useRouter } from 'next/navigation'
import { useCallback, useState } from 'react'

import type { ChatContent, ClientChatContent } from './types'

export function useChat(
	chatId?: string,
	initialMessages?: ChatContent[],
	initialIsDraft?: boolean,
) {
	const pathname = usePathname()
	const router = useRouter()

	const [messages, setMessages] = useState<ClientChatContent[]>(() =>
		(initialMessages ?? []).map((m) => ({ ...m, id: crypto.randomUUID() })),
	)

	const [isDraft, setIsDraft] = useState(initialIsDraft ?? false)
	const [sending, setSending] = useState(false)

	const sendMessage = useCallback(
		async (content: string) => {
			if (!chatId) return

			setSending(true)

			const userMessage: ClientChatContent = {
				id: crypto.randomUUID(),
				role: 'user',
				content,
			}

			setMessages((prev) => [...prev, userMessage])

			try {
				const response = await fetch(`/api/chat/${chatId}`, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ content }),
				})

				if (!response?.ok || !response.body) {
					setSending(false)

					return
				}

				const agentId = crypto.randomUUID()

				setMessages((prev) => [...prev, { id: agentId, role: 'agent', content: '' }])

				const reader = response.body
					.pipeThrough(new TextDecoderStream())
					.pipeThrough(new EventSourceParserStream())
					.getReader()

				while (true) {
					const { done, value } = await reader.read()

					if (done) break

					if (value.event === 'content') {
						setMessages((prev) =>
							prev.map((m) => (m.id === agentId ? { ...m, content: value.data } : m)),
						)
					}
				}

				if (isDraft) {
					setIsDraft(false)

					router.replace(`/${chatId}`)

					router.refresh()
				}
			} finally {
				setSending(false)
			}
		},
		[chatId, isDraft, router],
	)

	function newChat() {
		const id = crypto.randomUUID()

		router.push(`/${id}?draft=true`)
	}

	async function deleteChat(id: string) {
		await fetch(`/api/chat/${id}`, { method: 'DELETE' }).catch(() => null)

		if (pathname === `/${id}`) {
			router.push('/')
		}

		router.refresh()
	}

	return { messages, sending, isDraft, sendMessage, newChat, deleteChat }
}
