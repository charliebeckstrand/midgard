/**
 * The rules over a chat transcript: transforms from one message list to the
 * next, and the readers that `retry` and `edit` run before them. `useChatSend`
 * is the React shell above them — it holds the state, it mints the ids, and it
 * drives the transport.
 *
 * No rule here reads a clock or a random source, because the caller supplies
 * each id — as an argument, or through the function `seedMessages` calls. That
 * is what makes the drop rule provable: a test can name the reply that one send
 * opened.
 */

import { isEmptyContent } from './chat-content/normalize'
import type { ChatMessageData } from './types'

/** The index of the last user message, or `-1` when the transcript holds none. */
function lastUserIndex(messages: ChatMessageData[]): number {
	return messages.findLastIndex((message) => message.role === 'user')
}

/**
 * The transcript with the user's message at its end, under the id the caller
 * mints.
 *
 * @internal
 */
export function appendUserMessage(
	messages: ChatMessageData[],
	id: string,
	content: string,
): ChatMessageData[] {
	return [...messages, { id, role: 'user', content }]
}

/**
 * The transcript with an empty assistant bubble at its end. The bubble holds
 * the reply the transport is about to stream.
 *
 * @internal
 */
export function openReply(messages: ChatMessageData[], id: string): ChatMessageData[] {
	return [...messages, { id, role: 'assistant', content: '' }]
}

/**
 * The transcript with one cumulative snapshot in the reply `id` names. A
 * snapshot is the full reply so far, so it replaces the bubble's content rather
 * than extends it. An id that names no message changes nothing.
 *
 * @internal
 */
export function applyReplySnapshot(
	messages: ChatMessageData[],
	id: string,
	snapshot: string,
): ChatMessageData[] {
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
 * Empty is read from the content's structure, and never from its plain-text
 * projection. A reply that holds a block with no text of its own projects to an
 * empty string, and it is not an empty reply.
 *
 * @internal
 */
export function dropEmptyReply(messages: ChatMessageData[], id: string): ChatMessageData[] {
	return messages.filter((message) => !(message.id === id && isEmptyContent(message.content)))
}

/**
 * Whether a message names itself. An empty id is no id: a rule that matched on
 * `''` would name every message that carries none.
 *
 * `seedMessages` and `duplicateMessageIds` both read this, so the rule that
 * assigns an id and the rule that reports a collision cannot disagree about what
 * an id is.
 *
 * @internal
 */
function hasMessageId(message: ChatMessageData): message is ChatMessageData & { id: string } {
	return Boolean(message.id)
}

/**
 * The transcript with an id on every message: one that carries an id keeps it,
 * and one that carries none takes the next id `mintId` returns.
 *
 * A seed message's id is the one a store persisted. Every target the transcript
 * holds is named by it, so a fresh id would re-key the whole conversation at
 * each mount, and a target written before a reload would name a message that no
 * longer exists.
 *
 * The caller mints, as it does for every rule here. It mints through a function
 * rather than an argument, because the rule cannot know how many ids it needs
 * until it reads the list — and a test can still name every id it assigns.
 *
 * @internal
 * @param mintId - Returns the id for one message that carries none.
 */
export function seedMessages(messages: ChatMessageData[], mintId: () => string): ChatMessageData[] {
	return messages.map((message) => (hasMessageId(message) ? message : { ...message, id: mintId() }))
}

/**
 * The ids that more than one message carries, in the order a second message
 * claims each. An empty list means every message names itself.
 *
 * Every rule here reads an id rather than a position, so two messages under one
 * id are edited, truncated, and rolled back together. The shell warns on this in
 * development; the rule is here because it is a fact about a transcript, and a
 * pure test can state it.
 *
 * @internal
 */
export function duplicateMessageIds(messages: ChatMessageData[]): string[] {
	const seen = new Set<string>()

	const duplicates = new Set<string>()

	for (const message of messages) {
		if (!hasMessageId(message)) continue

		if (seen.has(message.id)) duplicates.add(message.id)
		else seen.add(message.id)
	}

	return [...duplicates]
}

/**
 * The last user message in the transcript, or `undefined` when it holds none.
 * `retry` reads its content to send again.
 *
 * @internal
 */
export function lastUserMessage(messages: ChatMessageData[]): ChatMessageData | undefined {
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
export function truncateToLastUserMessage(messages: ChatMessageData[]): ChatMessageData[] {
	const index = lastUserIndex(messages)

	return index === -1 ? messages : messages.slice(0, index + 1)
}

/**
 * The user message `id` names, or `undefined` when the id names another message
 * or none. `edit` reads it as its guard, before it changes the transcript.
 *
 * @internal
 */
export function userMessage(messages: ChatMessageData[], id: string): ChatMessageData | undefined {
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
	messages: ChatMessageData[],
	id: string,
	content: string,
): ChatMessageData[] {
	const index = messages.findIndex((message) => message.id === id)

	// An id no message carries reads as -1, and `messages[-1]` is undefined, so
	// one check answers both.
	const current = messages[index]

	if (!current) return messages

	return [...messages.slice(0, index), { ...current, content }]
}
