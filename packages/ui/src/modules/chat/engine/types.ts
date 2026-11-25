import type { ChatPart } from './chat-content/types'

/**
 * A single message in a chat: the data a `ChatMessage` draws, as a transcript
 * holds it.
 */
export type ChatMessageData = {
	/**
	 * Names the message in its transcript. A server id where the store holds one,
	 * and absent for a client-only message until it is persisted. `useChatSend`
	 * assigns a client id to a seed message that carries none, and keeps the id a
	 * seed message carries.
	 *
	 * The id must be unique in the transcript, because every rule over the
	 * transcript reads it rather than a position.
	 */
	id?: string
	/** Who spoke. `system` is a status line rather than an utterance. */
	sender: 'user' | 'assistant' | 'system'
	/**
	 * What the message holds: prose, or the blocks it is built from. A `string`
	 * keeps working and normalizes to one text part, so a caller that holds a
	 * transcript of strings rewrites nothing.
	 */
	content: string | ChatPart[]
	timestamp?: string
	/**
	 * Marks an assistant reply whose send failed. The bubble keeps what the
	 * reply landed and says that the reply failed. `useChatSend` sets it when the
	 * transport throws, and `retry` replaces the reply.
	 */
	failed?: boolean
	/**
	 * Marks a user message that an edit sent in place of an earlier message. The
	 * message shows an "(edited)" label below its bubble. `edit` of
	 * `useChatSend` sets it on the new message.
	 */
	edited?: boolean
	/**
	 * Marks a message that its sender revised in place, after it sent the
	 * message. The message shows a "(revised)" label below its bubble. A
	 * {@link ChatRevision} that a transport yields sets it.
	 */
	revised?: boolean
}

/**
 * A chunk of a reply that revises an earlier message, such as an assistant
 * message whose text an action made stale.
 *
 * @remarks
 * `parts` merges into the message that `revise` names, by part id, as a part
 * list merges into a reply. A part under an id that the message holds replaces
 * that block, so the agent can strike or replace a sentence by sending its text
 * part again. A part under a new id joins the end. The message takes
 * `revised`. Send a revision whole, and not in pieces.
 *
 * An id that names no message on the shown path changes nothing.
 *
 * @example
 *   yield { revise: 'm2', parts: [{ kind: 'text', id: 't1', text: '~~Needs a contact.~~ Booked.' }] }
 */
export type ChatRevision = {
	/** The id of the message that the revision changes. */
	revise: string
	/** The blocks that change, by id. */
	parts: ChatPart[]
}

/**
 * One chunk that a transport yields: the prose of the reply so far, the blocks
 * of the reply that changed, or a revision of an earlier message.
 */
export type ChatReplyChunk = string | ChatPart[] | ChatRevision
