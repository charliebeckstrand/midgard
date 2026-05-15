'use client'

import { ArrowUp } from 'lucide-react'
import { type FormEvent, useEffect, useRef, useState } from 'react'
import { cn } from '../../core'
import { Alert, AlertTitle } from '../alert'
import { Button } from '../button'
import { Icon } from '../icon'
import { Input } from '../input'
import { Stack } from '../stack'
import type { ChatMessage } from './types'

export type MapShipmentChatProps = {
	messages: ChatMessage[]
	onSend?: (body: string) => unknown | Promise<unknown>
}

export function MapShipmentChat({ messages, onSend }: MapShipmentChatProps) {
	const [draft, setDraft] = useState('')

	const [pending, setPending] = useState(false)

	const scrollerRef = useRef<HTMLDivElement>(null)

	const inputRef = useRef<HTMLInputElement>(null)

	const refocusRef = useRef(false)

	const lastMessageId = messages[messages.length - 1]?.id

	useEffect(() => {
		const el = scrollerRef.current

		if (!el || lastMessageId === undefined) return

		el.scrollTop = el.scrollHeight
	}, [lastMessageId])

	useEffect(() => {
		if (pending || !refocusRef.current) return

		refocusRef.current = false
		inputRef.current?.focus()
	}, [pending])

	async function handleSend(event: FormEvent<HTMLFormElement>) {
		event.preventDefault()

		const body = draft.trim()

		if (!body || !onSend) return

		setPending(true)

		try {
			await onSend(body)

			setDraft('')
		} finally {
			refocusRef.current = true
			setPending(false)
		}
	}

	return (
		<Stack gap="lg">
			<div
				ref={scrollerRef}
				data-slot="map-shipment-chat"
				className={cn(
					'flex flex-col gap-2',
					'max-h-80 overflow-y-auto',
					'rounded-lg bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 p-4',
				)}
			>
				{messages.length === 0 ? (
					<Alert severity="info">
						<AlertTitle>No messages yet</AlertTitle>
					</Alert>
				) : (
					messages.map((m) => <ChatBubble key={m.id} message={m} />)
				)}
			</div>
			{onSend && (
				<form onSubmit={handleSend} className="flex items-center gap-2">
					<Input
						ref={inputRef}
						aria-label="Message"
						placeholder="Send message"
						value={draft}
						disabled={pending}
						onChange={(e) => setDraft(e.target.value)}
					/>
					<Button type="submit" color="blue" disabled={pending || draft.trim().length === 0}>
						<Icon icon={<ArrowUp />} size="xs" />
					</Button>
				</form>
			)}
		</Stack>
	)
}

function ChatBubble({ message }: { message: ChatMessage }) {
	const mine = message.author === 'me'

	const timestamp = message.timestamp
		? formatChatTimestamp(
				typeof message.timestamp === 'string' ? new Date(message.timestamp) : message.timestamp,
			)
		: null

	return (
		<div
			data-slot="map-shipment-chat-message"
			data-author={message.author}
			className={cn('flex flex-col', mine ? 'items-end' : 'items-start')}
		>
			<div
				className={cn(
					'max-w-[80%] rounded-2xl px-3 py-2 text-sm',
					mine
						? 'rounded-br-sm bg-blue-600 text-white'
						: 'rounded-bl-sm bg-white text-zinc-900 shadow-sm dark:bg-zinc-700 dark:text-zinc-100',
				)}
			>
				{message.body}
			</div>
			{timestamp && <span className="mt-0.5 text-xs text-zinc-500">{timestamp}</span>}
		</div>
	)
}

function formatChatTimestamp(date: Date) {
	if (Number.isNaN(date.getTime())) return null

	return date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
}
