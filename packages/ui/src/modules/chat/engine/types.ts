import type { ChatPart } from './chat-content/types'

/** A single message in a chat. */
export type ChatContent = {
	/**
	 * Names the message in its transcript. A server id where the store holds one,
	 * and absent for a client-only message until it is persisted; `useChatSend`
	 * assigns a client id to a seed message that carries none, and keeps the id a
	 * seed message carries.
	 *
	 * The id must be unique in the transcript, because every rule over the
	 * transcript reads it rather than a position.
	 */
	id?: string
	/** Who spoke. `system` is a status line rather than an utterance. */
	role: 'user' | 'assistant' | 'system'
	/**
	 * What the message holds: prose, or the blocks it is built from. A `string`
	 * keeps working and normalizes to one text part, so a caller that holds a
	 * transcript of strings rewrites nothing.
	 */
	content: string | ChatPart[]
	timestamp?: string
}
