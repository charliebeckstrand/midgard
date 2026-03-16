export type Chat = {
	id: string
	user_id: string
	created_at: string
	updated_at: string
}

export interface ChatMessage {
	role: 'user' | 'agent'
	content: string
}

export interface ClientChatMessage extends ChatMessage {
	id: string
	pending?: boolean
}
