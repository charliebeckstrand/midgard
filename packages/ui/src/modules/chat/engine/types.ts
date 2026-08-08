/** A single message in a chat. */
export type ChatContent = {
	/** Server id; absent for client-only messages until persisted. */
	id?: string
	role: 'user' | 'agent'
	content: string
	timestamp?: string
}
