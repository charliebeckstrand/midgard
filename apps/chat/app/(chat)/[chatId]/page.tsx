'use client'

import { PaperAirplaneIcon } from '@heroicons/react/20/solid'
import { Button, Textarea } from 'catalyst'
import { useParams } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'

interface Message {
	id: string
	role: 'user' | 'assistant'
	content: string
}

let messageIdCounter = 0

function nextMessageId() {
	return `msg-${Date.now()}-${++messageIdCounter}`
}

export default function ChatPage() {
	const { chatId } = useParams<{ chatId: string }>()
	const [messages, setMessages] = useState<Message[]>([])
	const [input, setInput] = useState('')
	const [isDraft, setIsDraft] = useState(true)
	const [sending, setSending] = useState(false)
	const messagesEndRef = useRef<HTMLDivElement>(null)

	const fetchChat = useCallback(async () => {
		const response = await fetch(`/api/chat/${chatId}`).catch(() => null)

		if (response?.ok) {
			const data = await response.json()
			const fetched = (data.messages ?? []) as Omit<Message, 'id'>[]
			setMessages(fetched.map((m) => ({ ...m, id: nextMessageId() })))
			setIsDraft(false)
		}
	}, [chatId])

	useEffect(() => {
		fetchChat()
	}, [fetchChat])

	function scrollToBottom() {
		messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
	}

	async function sendMessage() {
		const content = input.trim()

		if (!content || sending) return

		setSending(true)
		setInput('')

		const userMessage: Message = { id: nextMessageId(), role: 'user', content }
		setMessages((prev) => [...prev, userMessage])
		scrollToBottom()

		const response = await fetch(`/api/chat/${chatId}`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ message: content }),
		}).catch(() => null)

		if (response?.ok) {
			const data = await response.json()

			if (data.message) {
				setMessages((prev) => [
					...prev,
					{ id: nextMessageId(), role: 'assistant', content: data.message },
				])
				scrollToBottom()
			}

			if (isDraft) {
				setIsDraft(false)
			}
		}

		setSending(false)
	}

	function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault()
			sendMessage()
		}
	}

	return (
		<div className="flex h-full flex-col">
			<div className="flex-1 overflow-y-auto p-4">
				{messages.length === 0 && (
					<div className="flex h-full items-center justify-center text-zinc-400">
						Start a new conversation
					</div>
				)}
				<div className="mx-auto max-w-3xl space-y-4">
					{messages.map((message) => (
						<div
							key={message.id}
							className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
						>
							<div
								className={`max-w-[80%] rounded-lg px-4 py-2 ${
									message.role === 'user'
										? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900'
										: 'bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-white'
								}`}
							>
								<p className="whitespace-pre-wrap">{message.content}</p>
							</div>
						</div>
					))}
					<div ref={messagesEndRef} />
				</div>
			</div>
			<div className="border-t border-zinc-200 p-4 dark:border-zinc-700">
				<div className="mx-auto flex max-w-3xl items-end gap-2">
					<Textarea
						value={input}
						onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setInput(e.target.value)}
						onKeyDown={handleKeyDown}
						placeholder="Type a message..."
						rows={1}
						className="flex-1"
					/>
					<Button onClick={sendMessage} disabled={!input.trim() || sending}>
						<PaperAirplaneIcon className="size-5" />
					</Button>
				</div>
			</div>
		</div>
	)
}
