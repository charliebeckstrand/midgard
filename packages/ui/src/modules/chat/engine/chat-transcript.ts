/**
 * The rules over a chat transcript: transforms from one message list to the
 * next, and the readers that `retry` and `edit` run before them. `useChatSend`
 * is the React shell above them — it holds the state, it mints the ids, and it
 * drives the transport.
 *
 * No rule here reads a clock or a random source, because the caller supplies
 * each id. That is what makes the drop rule provable: a test can name the reply
 * that one send opened.
 */

import type { ChatContent } from './types'

/** The index of the last user message, or `-1` when the transcript holds none. */
function lastUserIndex(messages: ChatContent[]): number {
	return messages.findLastIndex((message) => message.role === 'user')
}

/**
 * The transcript with the user's message at its end, under the id the caller
 * mints.
 *
 * @internal
 */
export function appendUserMessage(
	messages: ChatContent[],
	id: string,
	content: string,
): ChatContent[] {
	return [...messages, { id, role: 'user', content }]
}

/**
 * The transcript with an empty agent bubble at its end. The bubble holds the
 * reply the transport is about to stream.
 *
 * @internal
 */
export function openReply(messages: ChatContent[], id: string): ChatContent[] {
	return [...messages, { id, role: 'agent', content: '' }]
}

/**
 * The transcript with one cumulative snapshot in the reply `id` names. A
 * snapshot is the full reply so far, so it replaces the bubble's content rather
 * than extends it. An id that names no message changes nothing.
 *
 * @internal
 */
export function applyReplySnapshot(
	messages: ChatContent[],
	id: string,
	snapshot: string,
): ChatContent[] {
	return messages.map((message) =>
		message.id === id ? { ...message, content: snapshot } : message,
	)
}

/**
 * The transcript without the reply `id` names, while that reply is still empty.
 * A failed send drops its own placeholder this way, and keeps the user's message
 * and any partial reply.
 *
 * @remarks The rule reads the id rather than the empty content, so an empty
 * bubble another send opened stays. An id that opened no reply drops nothing.
 *
 * @internal
 */
export function dropEmptyReply(messages: ChatContent[], id: string): ChatContent[] {
	return messages.filter((message) => !(message.id === id && message.content === ''))
}

/**
 * The last user message in the transcript, or `undefined` when it holds none.
 * `retry` reads its content to send again.
 *
 * @internal
 */
export function lastUserMessage(messages: ChatContent[]): ChatContent | undefined {
	const index = lastUserIndex(messages)

	return index === -1 ? undefined : messages[index]
}

/**
 * The transcript cut to its last user message, which it keeps: what `retry`
 * discards is that message's reply, and every turn after it. A transcript with
 * no user message stays as it is.
 *
 * @internal
 */
export function truncateToLastUserMessage(messages: ChatContent[]): ChatContent[] {
	const index = lastUserIndex(messages)

	return index === -1 ? messages : messages.slice(0, index + 1)
}

/**
 * The user message `id` names, or `undefined` when the id names another message
 * or none. `edit` reads it as its guard, before it changes the transcript.
 *
 * @internal
 */
export function userMessage(messages: ChatContent[], id: string): ChatContent | undefined {
	return messages.find((message) => message.id === id && message.role === 'user')
}

/**
 * The transcript cut to the message `id` names, with `content` in place of that
 * message's own: what `edit` discards is the reply to the old content, and every
 * turn after it. An id that names no message changes nothing.
 *
 * @internal
 */
export function truncateToEditedMessage(
	messages: ChatContent[],
	id: string,
	content: string,
): ChatContent[] {
	const index = messages.findIndex((message) => message.id === id)

	// An id no message carries reads as -1, and `messages[-1]` is undefined, so
	// one check answers both.
	const current = messages[index]

	if (!current) return messages

	return [...messages.slice(0, index), { ...current, content }]
}
