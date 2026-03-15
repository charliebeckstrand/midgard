'use client'

import { useRouter } from 'next/navigation'
import { useRef, useState } from 'react'

import { ChatInput } from './chat-input'
import { Message } from './message'

interface ChatMessage {
	id: string
	role: 'user' | 'agent'
	message: string
	pending?: boolean
}

interface Props {
	chatId: string
	initialMessages: Omit<ChatMessage, 'id'>[]
	isDraft: boolean
}

export function ChatView({ chatId, initialMessages, isDraft: initialIsDraft }: Props) {
	const router = useRouter()

	const [messages, setMessages] = useState<ChatMessage[]>(() =>
		initialMessages.map((m) => ({ ...m, id: crypto.randomUUID() })),
	)

	const [isDraft, setIsDraft] = useState(initialIsDraft)

	const [sending, setSending] = useState(false)

	const messagesEndRef = useRef<HTMLDivElement>(null)

	function scrollToBottom() {
		messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
	}

	async function sendMessage(content: string) {
		setSending(true)

		const userMessage: ChatMessage = { id: crypto.randomUUID(), role: 'user', message: content }
		const pendingId = crypto.randomUUID()

		setMessages((prev) => [
			...prev,
			userMessage,
			{ id: pendingId, role: 'agent', message: '', pending: true },
		])

		scrollToBottom()

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

				scrollToBottom()

				await fetch(`/api/chat/${chatId}`, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ message: data.message, role: 'agent' }),
				}).catch(() => null)
			}

			if (isDraft) {
				setIsDraft(false)

				router.replace(`/${chatId}`)
			}
		} else {
			setMessages((prev) => prev.filter((m) => m.id !== pendingId))
		}

		setSending(false)
	}

	return (
		<div className="flex h-full justify-center">
			<div className="flex flex-col h-full max-w-4xl flex-1 justify-center">
				{!isDraft && (
					<div className="flex-1 grow overflow-y-auto p-4">
						{messages.length > 0 && (
							<div className="mx-auto space-y-4">
								{messages.map((message) => (
									<Message
										key={message.id}
										role={message.role}
										message={message.message}
										pending={message.pending}
									/>
								))}
								<div ref={messagesEndRef} />
							</div>
						)}
					</div>
				)}

				<ChatInput onSend={sendMessage} disabled={sending} />
			</div>
		</div>
	)
}
