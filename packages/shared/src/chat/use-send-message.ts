'use client'

import { EventSourceParserStream } from 'eventsource-parser/stream'
import { useRouter } from 'next/navigation'
import { useCallback, useState } from 'react'
import { useToast } from 'ui/providers/toast'

import type { ChatContent } from './types'

type UseSendMessageOptions = {
	/** Called once a draft chat is committed by its first sent message. */
	onChatCreated?: () => void
}

/**
 * Manages a chat's message list and streams agent replies over SSE.
 *
 * @remarks
 * `sendMessage` optimistically appends the user message, POSTs to
 * `/api/chat/:chatId`, then parses the `content` SSE events into a single agent
 * bubble. On the first send of a draft it clears draft state and `router.replace`s
 * to the committed chat url. A failed request or stream drops the empty agent
 * placeholder, keeps the user message, and toasts an error. No-ops without `chatId`.
 *
 * @param chatId - Target chat id; sends are skipped while undefined.
 * @param initialMessages - Seed messages; each is assigned a client id.
 * @param initialIsDraft - Whether the chat starts as an uncommitted draft. Defaults to `false`.
 * @param options - See {@link UseSendMessageOptions}.
 * @returns `{ messages, sending, isDraft, sendMessage }`.
 */
export function useSendMessage(
	chatId?: string,
	initialMessages?: ChatContent[],
	initialIsDraft?: boolean,
	options?: UseSendMessageOptions,
) {
	const router = useRouter()

	const { toast } = useToast()

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

			const notifyFailure = () =>
				toast({
					title: 'Message failed',
					description: 'Your message could not be sent. Please try again.',
					severity: 'error',
				})

			// Hoisted so the catch can target this exact bubble by id rather than
			// matching on empty content (which would also hit unrelated messages).
			let agentId: string | undefined

			try {
				const response = await fetch(`/api/chat/${chatId}`, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ content }),
				})

				if (!response.ok || !response.body) {
					notifyFailure()

					return
				}

				agentId = crypto.randomUUID()

				setMessages((prev) => [...prev, { id: agentId, role: 'agent', content: '' }])

				const reader = response.body
					.pipeThrough(new TextDecoderStream())
					.pipeThrough(new EventSourceParserStream())
					.getReader()

				while (true) {
					const { done, value } = await reader.read()

					if (done) break

					if (value.event === 'content') {
						// `content` events carry the full cumulative reply, so each one
						// replaces the bubble's text rather than appending to it.
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
			} catch {
				// Network or stream failure: drop this send's agent placeholder if it
				// never received content, so no blank bubble lingers; the user's
				// message and any partial reply stay. Keyed by id so concurrent or
				// prior empty agent messages are untouched.
				setMessages((prev) => prev.filter((m) => !(m.id === agentId && m.content === '')))

				notifyFailure()
			} finally {
				setSending(false)
			}
		},
		[chatId, isDraft, router, options, toast],
	)

	return { messages, sending, isDraft, sendMessage }
}
