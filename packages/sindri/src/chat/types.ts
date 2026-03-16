export type Chat = {
	id: string
	user_id: string
	created_at: string
	updated_at: string
}

export interface ChatContent {
	role: 'user' | 'agent'
	content: string
}

export interface ClientChatContent extends ChatContent {
	id: string
	pending?: boolean
}
