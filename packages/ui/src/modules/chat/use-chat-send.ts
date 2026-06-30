'use client'

import { useCallback, useState } from 'react'
import type { ChatContent } from './types'

/**
 * Produces an agent reply for a sent message as a stream of cumulative snapshots.
 *
 * @remarks
 * Each yielded string is the *full* reply so far (not a delta), so the agent
 * bubble is replaced — not appended — on every chunk; this mirrors SSE
 * transports that emit the running text. Yield once for a non-streaming reply.
 * Throwing (or rejecting) rolls back the empty agent placeholder and triggers
 * {@link UseChatSendOptions.onError}.
 *
 * @param content - The trimmed user message being sent.
 * @returns An async iterable of cumulative reply snapshots.
 */
export type ChatTransport = (
	content: string,
) => AsyncIterable<string> | Promise<AsyncIterable<string>>

/** Options for {@link useChatSend}. */
export type UseChatSendOptions = {
	/** Seed messages; each is assigned a client id. */
	initialMessages?: ChatContent[]
	/** Streams the agent reply for a sent message. See {@link ChatTransport}. */
	transport: ChatTransport
	/** Called with the trimmed content once a send completes without error. */
	onSent?: (content: string) => void
	/** Called when the transport throws or the stream fails. */
	onError?: (error: unknown) => void
}

/** Return shape of {@link useChatSend}. */
export type UseChatSend = {
	/** The live message list (optimistic user message + streamed agent reply). */
	messages: ChatContent[]
	/** True while a reply is in flight. */
	sending: boolean
	/** Optimistically appends the user message and streams the reply via the transport. No-ops on empty input. */
	send: (content: string) => Promise<void>
	/** Escape hatch for direct list edits (e.g. seeding history or clearing). */
	setMessages: React.Dispatch<React.SetStateAction<ChatContent[]>>
}

/**
 * Drives a chat's message list and streams agent replies through an injected transport.
 *
 * @remarks
 * `send` optimistically appends the user message, opens an empty agent bubble,
 * then replaces that bubble's text with each snapshot the {@link ChatTransport}
 * yields. A transport failure drops the still-empty placeholder (keyed by id, so
 * concurrent or prior empty bubbles are untouched), keeps the user message, and
 * fires `onError`. The transport is supplied by the caller, keeping this hook
 * free of any framework, endpoint, or wire-format assumptions.
 *
 * @param options - See {@link UseChatSendOptions}.
 * @returns See {@link UseChatSend}.
 */
export function useChatSend({
	initialMessages,
	transport,
	onSent,
	onError,
}: UseChatSendOptions): UseChatSend {
	const [messages, setMessages] = useState<ChatContent[]>(() =>
		(initialMessages ?? []).map((message) => ({ ...message, id: crypto.randomUUID() })),
	)

	const [sending, setSending] = useState(false)

	const send = useCallback(
		async (content: string) => {
			const text = content.trim()

			if (!text) return

			setSending(true)

			setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: 'user', content: text }])

			// Hoisted so the catch can target this exact bubble by id rather than
			// matching on empty content (which would also hit unrelated messages).
			let agentId: string | undefined

			try {
				const stream = await transport(text)

				agentId = crypto.randomUUID()

				setMessages((prev) => [...prev, { id: agentId, role: 'agent', content: '' }])

				for await (const snapshot of stream) {
					// Snapshots are cumulative, so each replaces the bubble's text.
					setMessages((prev) =>
						prev.map((message) =>
							message.id === agentId ? { ...message, content: snapshot } : message,
						),
					)
				}

				onSent?.(text)
			} catch (error) {
				// Drop this send's agent placeholder if it never received content, so no
				// blank bubble lingers; the user's message and any partial reply stay.
				setMessages((prev) =>
					prev.filter((message) => !(message.id === agentId && message.content === '')),
				)

				onError?.(error)
			} finally {
				setSending(false)
			}
		},
		[transport, onSent, onError],
	)

	return { messages, sending, send, setMessages }
}
