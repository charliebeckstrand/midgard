'use client'

import { useRouter } from 'next/navigation'
import { useCallback, useRef, useState } from 'react'

import type { ChatMessage, ClientChatMessage, ToolCall, ToolCallName } from '../types'

function parseSSEEvents(chunk: string): Array<Record<string, unknown>> {
	const events: Array<Record<string, unknown>> = []

	for (const block of chunk.split('\n\n')) {
		const dataLine = block.split('\n').find((line) => line.startsWith('data:'))

		if (!dataLine) continue

		try {
			events.push(JSON.parse(dataLine.slice(5).trim()))
		} catch {
			// skip malformed events
		}
	}

	return events
}

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
	const fullContentRef = useRef('')
	const toolCallsRef = useRef<Map<string, { name: ToolCallName; args: string }>>(new Map())

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

			const saveUserResponse = await fetch(`/api/chat/${chatId}`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ content, role: 'user' }),
			}).catch(() => null)

			if (!saveUserResponse?.ok) {
				setMessages((prev) => prev.filter((m) => m.id !== pendingId))

				setSending(false)

				return
			}

			const allMessages = [...messages, userMessage].map(({ role, content: c }) => ({
				role,
				content: c,
			}))

			const agentResponse = await fetch('/api/chat/agent', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ messages: allMessages }),
			}).catch(() => null)

			if (!agentResponse?.ok || !agentResponse.body) {
				setMessages((prev) => prev.filter((m) => m.id !== pendingId))

				setSending(false)

				return
			}

			fullContentRef.current = ''
			toolCallsRef.current = new Map()

			const reader = agentResponse.body.getReader()
			const decoder = new TextDecoder()
			let buffer = ''

			while (true) {
				const { done, value } = await reader.read()

				if (done) break

				buffer += decoder.decode(value, { stream: true })

				const lastDoubleNewline = buffer.lastIndexOf('\n\n')

				if (lastDoubleNewline === -1) continue

				const complete = buffer.slice(0, lastDoubleNewline + 2)
				buffer = buffer.slice(lastDoubleNewline + 2)

				for (const event of parseSSEEvents(complete)) {
					switch (event.type) {
						case 'TEXT_MESSAGE_CONTENT': {
							fullContentRef.current += event.delta as string

							const accumulated = fullContentRef.current

							setMessages((prev) =>
								prev.map((m) =>
									m.id === pendingId ? { ...m, content: accumulated, pending: true } : m,
								),
							)

							break
						}

						case 'TOOL_CALL_START': {
							toolCallsRef.current.set(event.toolCallId as string, {
								name: event.toolCallName as ToolCallName,
								args: '',
							})

							break
						}

						case 'TOOL_CALL_ARGS': {
							const tc = toolCallsRef.current.get(event.toolCallId as string)

							if (tc) {
								tc.args += event.delta as string
							}

							break
						}

						case 'TOOL_CALL_END': {
							const completed: ToolCall[] = []

							for (const [id, tc] of toolCallsRef.current) {
								completed.push({ id, name: tc.name, args: tc.args })
							}

							setMessages((prev) =>
								prev.map((m) => (m.id === pendingId ? { ...m, toolCalls: completed } : m)),
							)

							break
						}

						case 'TEXT_MESSAGE_END': {
							setMessages((prev) =>
								prev.map((m) => (m.id === pendingId ? { ...m, pending: false } : m)),
							)

							break
						}
					}
				}
			}

			if (fullContentRef.current) {
				await fetch(`/api/chat/${chatId}`, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ content: fullContentRef.current, role: 'agent' }),
				}).catch(() => null)
			}

			if (isDraft) {
				setIsDraft(false)
				router.replace(`/${chatId}`)
				router.refresh()
			}

			setSending(false)
		},
		[chatId, isDraft, messages, router],
	)

	return { messages, sending, isDraft, sendMessage }
}
