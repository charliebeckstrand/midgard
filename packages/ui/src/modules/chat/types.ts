/** A chat conversation record, as returned by the gateway. */
export type Chat = {
	id: string
	user_id: string
	created_at: string
	updated_at: string
}

/** A single message in a chat. */
export type ChatContent = {
	/** Server id; absent for client-only messages until persisted. */
	id?: string
	role: 'user' | 'agent'
	content: string
}
