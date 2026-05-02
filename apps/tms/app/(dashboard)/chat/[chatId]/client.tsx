'use client'

import { CircleDashed } from 'lucide-react'
import { useSearchParams } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { Button } from 'ui/button'
import { ChatMessage } from 'ui/chat-message'
import { ChatPrompt } from 'ui/chat-prompt'
import { Heading } from 'ui/heading'
import { Icon } from 'ui/icon'
import { Stack } from 'ui/stack'

type Message = {
	id: string
	type: 'user' | 'assistant'
	content: string
	createdAt: number
}

const timeFormatter = new Intl.DateTimeFormat(undefined, {
	hour: 'numeric',
	minute: '2-digit',
})

export default function ChatIdClient({ chatId }: { chatId: string }) {
	const searchParams = useSearchParams()

	const initialMessage = searchParams.get('message')

	const [messages, setMessages] = useState<Message[]>(() =>
		initialMessage
			? [
					{
						id: crypto.randomUUID(),
						type: 'user',
						content: initialMessage,
						createdAt: Date.now(),
					},
				]
			: [],
	)

	const [value, setValue] = useState('')

	const consumedInitial = useRef(false)

	useEffect(() => {
		if (!initialMessage || consumedInitial.current) return

		consumedInitial.current = true

		const url = new URL(window.location.href)

		url.searchParams.delete('message')

		window.history.replaceState({}, '', url.toString())
	}, [initialMessage])

	function handleSubmit() {
		const content = value.trim()

		if (!content) return

		setMessages((prev) => [
			...prev,
			{ id: crypto.randomUUID(), type: 'user', content, createdAt: Date.now() },
		])

		setValue('')
	}

	return (
		<Stack gap="lg" className="h-full">
			<Heading>Chat {chatId.slice(0, 8)}</Heading>
			<Stack gap="md" className="flex-1 min-h-0 overflow-y-auto">
				{messages.map((message) => (
					<ChatMessage
						key={message.id}
						type={message.type}
						timestamp={timeFormatter.format(message.createdAt)}
					>
						{message.content}
					</ChatMessage>
				))}
			</Stack>
			<ChatPrompt
				value={value}
				onValueChange={setValue}
				onSubmit={handleSubmit}
				actions={
					<Button variant="plain" size="sm" prefix={<Icon icon={<CircleDashed />} />}>
						Data Analyst
					</Button>
				}
			/>
		</Stack>
	)
}
