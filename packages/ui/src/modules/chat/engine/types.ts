import type { ChatPart } from './chat-content/types'

/** A single message in a chat. */
export type ChatContent = {
	/** Server id; absent for client-only messages until persisted. */
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
