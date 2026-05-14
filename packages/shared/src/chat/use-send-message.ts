'use client'

import { EventSourceParserStream } from 'eventsource-parser/stream'
import { useRouter } from 'next/navigation'
import { useCallback, useState } from 'react'

import type { ChatContent } from './types'

interface UseSendMessageOptions {
	onChatCreated?: () => void
}

export function useSendMessage(
	chatId?: string,
	initialMessages?: ChatContent[],
	initialIsDraft?: boolean,
	options?: UseSendMessageOptions,
) {
	const router = useRouter()

	const [messages, setMessages] = useState<ChatContent[]>(() =>
		(initialMessages ?? []).map((m) => ({ ...m, id: crypto.randomUUID() })),
	)

	const [isDraft, setIsDraft] = useState(initialIsDraft ?? false)
	const [sending, setSending] = useState(false)

	const sendMessage = useCallback(
		async (content: string) => {
			if (!chatId) return

			setSending(true)

			const userMessage: ChatContent = {
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

					options?.onChatCreated?.()
				}
			} finally {
				setSending(false)
			}
		},
		[chatId, isDraft, router, options],
	)

	return { messages, sending, isDraft, sendMessage }
}
