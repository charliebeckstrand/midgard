'use client'

import { ArrowUp } from 'lucide-react'
import { type FormEvent, useEffect, useRef, useState } from 'react'
import { cn } from '../../core'
import { Alert, AlertTitle } from '../alert'
import { Button } from '../button'
import { ChatMessage } from '../chat-message'
import { Icon } from '../icon'
import { Input } from '../input'
import { Stack } from '../stack'
import type { ChatMessage as ChatMessageData } from './types'

export type MapShipmentChatProps = {
	messages: ChatMessageData[]
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
					messages.map((m) => (
						<ChatMessage
							key={m.id}
							type={m.author === 'me' ? 'user' : 'assistant'}
							timestamp={m.timestamp ? formatChatTimestamp(m.timestamp) : undefined}
						>
							{m.body}
						</ChatMessage>
					))
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

function formatChatTimestamp(timestamp: string | Date) {
	const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp

	if (Number.isNaN(date.getTime())) return undefined

	return date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
}
