/** A single message in a chat. */
export type ChatContent = {
	/** Server id; absent for client-only messages until persisted. */
	id?: string
	/** Who spoke. `system` is a status line rather than an utterance. */
	role: 'user' | 'assistant' | 'system'
	content: string
	timestamp?: string
}
