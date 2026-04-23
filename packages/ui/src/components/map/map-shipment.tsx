'use client'

import { ArrowUp, Truck } from 'lucide-react'
import { type FormEvent, useEffect, useRef, useState } from 'react'
import { cn } from '../../core'
import { Alert, AlertTitle } from '../alert'
import { Button } from '../button'
import { Dialog, DialogActions, DialogBody, DialogTitle } from '../dialog'
import { DescriptionDetails, DescriptionList, DescriptionTerm } from '../dl'
import { Icon } from '../icon'
import { Input } from '../input'
import { Stack } from '../stack'
import { Tab, TabContent, TabContents, TabList, Tabs } from '../tabs'
import { Text } from '../text'
import { MapMarker } from './map-marker'
import type { ChatMessage, ShipmentData } from './types'

export type MapShipmentProps = {
	data: ShipmentData
	/** Called when the user sends a chat message. If omitted and `data.messages` is empty, the chat tab is hidden. */
	onSendMessage?: (body: string) => unknown | Promise<unknown>
	/** Fires before the default Dialog opens. Return `false` to prevent the default. */
	onSelect?: (shipment: ShipmentData) => boolean | undefined
}

export function MapShipment({ data, onSendMessage, onSelect }: MapShipmentProps) {
	const [open, setOpen] = useState(false)

	const hasChat = onSendMessage !== undefined || (data.messages && data.messages.length > 0)

	return (
		<>
			<MapMarker
				position={data.position}
				onClick={() => {
					if (onSelect?.(data) === false) return

					setOpen(true)
				}}
			>
				<ShipmentPin label={data.label} />
			</MapMarker>
			<Dialog open={open} onOpenChange={setOpen} size="md">
				<DialogTitle>{data.label}</DialogTitle>
				<DialogBody>
					{hasChat ? (
						<Tabs defaultValue="info">
							<TabList>
								<Tab value="info">Info</Tab>
								<Tab value="chat">Chat</Tab>
							</TabList>
							<TabContents>
								<TabContent value="info">
									<ShipmentInfo data={data} />
								</TabContent>
								<TabContent value="chat">
									<ShipmentChat messages={data.messages ?? []} onSend={onSendMessage} />
								</TabContent>
							</TabContents>
						</Tabs>
					) : (
						<ShipmentInfo data={data} />
					)}
					<DialogActions>
						<Button onClick={() => setOpen(false)}>Close</Button>
					</DialogActions>
				</DialogBody>
			</Dialog>
		</>
	)
}

function ShipmentPin({ label }: { label: string }) {
	return (
		<Button
			title={label}
			className="rounded-full hover:scale-110 transition cursor-pointer"
			prefix={<Icon icon={<Truck />} size="sm" />}
		/>
	)
}

function ShipmentInfo({ data }: { data: ShipmentData }) {
	const rows: Array<{ label: string; value: string }> = []

	if (data.status) rows.push({ label: 'Status', value: data.status })

	if (data.eta) {
		const eta = typeof data.eta === 'string' ? new Date(data.eta) : data.eta

		rows.push({
			label: 'ETA',
			value: Number.isNaN(eta.getTime())
				? String(data.eta)
				: eta.toLocaleString(undefined, {
						month: 'short',
						day: 'numeric',
						hour: 'numeric',
						minute: '2-digit',
					}),
		})
	}

	if (data.info) rows.push(...data.info)

	if (rows.length === 0) {
		return <Text variant="muted">No shipment details available.</Text>
	}

	return (
		<DescriptionList>
			{rows.map((row) => (
				<div key={row.label} className="contents">
					<DescriptionTerm>{row.label}</DescriptionTerm>
					<DescriptionDetails>{row.value}</DescriptionDetails>
				</div>
			))}
		</DescriptionList>
	)
}

type ShipmentChatProps = {
	messages: ChatMessage[]
	onSend?: (body: string) => unknown | Promise<unknown>
}

function ShipmentChat({ messages, onSend }: ShipmentChatProps) {
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
		<Stack gap={4}>
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
					<Alert type="info">
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
					<Button
						type="submit"
						color="blue"
						disabled={pending || draft.trim().length === 0}
						prefix={<Icon icon={<ArrowUp />} size="xs" />}
					/>
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
