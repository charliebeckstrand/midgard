'use client'

import { useCallback, useRef, useState } from 'react'
import { draftContent } from './engine/chat-draft'
import {
	appendUserMessage,
	applyReplySnapshot,
	dropEmptyReply,
	lastUserMessage,
	openReply,
	truncateToEditedMessage,
	truncateToLastUserMessage,
	userMessage,
} from './engine/chat-transcript'
import type { ChatContent } from './types'

/**
 * Produces an assistant reply for a sent message as a stream of cumulative snapshots.
 *
 * @remarks
 * Each yielded string is the *full* reply so far (not a delta), so the
 * assistant bubble is replaced — not appended — on every chunk; this mirrors SSE
 * transports that emit the running text. Yield once for a non-streaming reply.
 * Throwing (or rejecting) rolls back the empty assistant placeholder and triggers
 * {@link UseChatSendOptions.onError}. `signal` aborts when {@link UseChatSend.stop}
 * is called; forward it to the underlying request (e.g. `fetch(url, { signal })`)
 * so the transport stops producing, not just the hook consuming — a transport
 * that ignores it still has its snapshots dropped, but keeps running underneath.
 *
 * @param content - The trimmed user message being sent.
 * @param signal - Aborts when the send is stopped.
 * @returns An async iterable of cumulative reply snapshots.
 */
export type ChatTransport = (
	content: string,
	signal: AbortSignal,
) => AsyncIterable<string> | Promise<AsyncIterable<string>>

/** Options for {@link useChatSend}. */
export type UseChatSendOptions = {
	/** Seed messages; each is assigned a client id. */
	initialMessages?: ChatContent[]
	/** Streams the assistant reply for a sent message. See {@link ChatTransport}. */
	transport: ChatTransport
	/**
	 * Called with the trimmed content once a send completes without error.
	 *
	 * @remarks
	 * This reports the completed send, not the submit gesture. The gesture is
	 * `useChatDraft`'s `onSubmit`, which fires when the composer submits; this
	 * fires after the transport's last snapshot lands. A stop or a transport
	 * failure skips it.
	 */
	onSent?: (content: string) => void
	/** Called when the transport throws or the stream fails. */
	onError?: (error: unknown) => void
}

/** Return shape of {@link useChatSend}. */
export type UseChatSend = {
	/** The live message list (optimistic user message + streamed assistant reply). */
	messages: ChatContent[]
	/** True while a reply is in flight. Spelled as `ChatPrompt` and `ChatTranscript` spell it, so it feeds either one directly. */
	streaming: boolean
	/** Optimistically appends the user message and streams the reply via the transport. No-ops on empty input. */
	send: (content: string) => Promise<void>
	/**
	 * Regenerates the reply to the last user message: drops it and anything
	 * after it (an existing assistant reply, or nothing if the prior send errored),
	 * then streams a fresh one for the same content. No-ops with no user
	 * message in the transcript, or while a send is already in flight.
	 */
	retry: () => Promise<void>
	/**
	 * Replaces a prior user message's content and regenerates from there,
	 * discarding everything after it (its old reply and any later turns). No-ops
	 * if `id` doesn't match a user message, `content` trims empty, or a send is
	 * already in flight.
	 */
	edit: (id: string, content: string) => Promise<void>
	/**
	 * Aborts the in-flight send, retry, or edit, via the {@link ChatTransport}'s
	 * `signal`. No-ops when nothing is in flight. Whatever snapshot already
	 * landed in the assistant bubble stays; `onError` and `onSent` do not fire.
	 */
	stop: () => void
	/** Escape hatch for direct list edits (e.g. seeding history or clearing). */
	setMessages: React.Dispatch<React.SetStateAction<ChatContent[]>>
}

/**
 * Drives a chat's message list and streams assistant replies through an injected transport.
 *
 * @remarks
 * `send` optimistically appends the user message, opens an empty assistant bubble,
 * then replaces that bubble's text with each snapshot the {@link ChatTransport}
 * yields. {@link UseChatSend.retry} and {@link UseChatSend.edit} share that same
 * streaming path — re-pointed at the last user message's content, or an edited
 * one — after trimming the transcript back to (and, for `edit`, including) that
 * message. Across all three, a transport failure drops the still-empty
 * placeholder (keyed by id, so concurrent or prior empty bubbles are untouched),
 * keeps the user message, and fires `onError`. {@link UseChatSend.stop} aborts
 * whichever of the three is in flight, leaving the bubble at its last-applied
 * snapshot without treating the stop as an error. The transport is supplied by
 * the caller, keeping this hook free of any framework, endpoint, or wire-format
 * assumptions.
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

	const [streaming, setStreaming] = useState(false)

	// The in-flight send's controller, so `stop` can reach it; null between sends.
	const controllerRef = useRef<AbortController | null>(null)

	// Streams a reply for `text` onto whatever history send/retry/edit already
	// committed via setMessages — the one path all three share.
	const runTransport = useCallback(
		async (text: string) => {
			setStreaming(true)

			const controller = new AbortController()

			controllerRef.current = controller

			// Minted before the try, so the catch can name this send's own bubble.
			const replyId = crypto.randomUUID()

			try {
				const stream = await transport(text, controller.signal)

				setMessages((prev) => openReply(prev, replyId))

				for await (const snapshot of stream) {
					// Checked first so a stop mid-stream leaves the bubble at its last
					// snapshot; breaking here also calls the async iterator's `return`,
					// so a well-behaved transport's cleanup (e.g. releasing a reader) runs.
					if (controller.signal.aborted) break

					setMessages((prev) => applyReplySnapshot(prev, replyId, snapshot))
				}

				if (!controller.signal.aborted) onSent?.(text)
			} catch (error) {
				// A stop-induced rejection isn't a failure: no rollback, no onError.
				if (controller.signal.aborted) return

				setMessages((prev) => dropEmptyReply(prev, replyId))

				onError?.(error)
			} finally {
				controllerRef.current = null

				setStreaming(false)
			}
		},
		[transport, onSent, onError],
	)

	const stop = useCallback(() => {
		controllerRef.current?.abort()
	}, [])

	const send = useCallback(
		async (content: string) => {
			if (streaming) return

			const text = draftContent(content)

			if (!text) return

			// Minted outside the updater, which React can run more than once.
			const userId = crypto.randomUUID()

			setMessages((prev) => appendUserMessage(prev, userId, text))

			await runTransport(text)
		},
		[streaming, runTransport],
	)

	const retry = useCallback(async () => {
		if (streaming) return

		const lastUser = lastUserMessage(messages)

		if (!lastUser) return

		setMessages((prev) => truncateToLastUserMessage(prev))

		await runTransport(lastUser.content)
	}, [streaming, messages, runTransport])

	const edit = useCallback(
		async (id: string, content: string) => {
			if (streaming) return

			const text = draftContent(content)

			if (!text) return

			if (!userMessage(messages, id)) return

			setMessages((prev) => truncateToEditedMessage(prev, id, text))

			await runTransport(text)
		},
		[streaming, messages, runTransport],
	)

	return { messages, streaming, send, retry, edit, stop, setMessages }
}
