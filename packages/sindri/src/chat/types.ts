export type Chat = {
	id: string
	user_id: string
	created_at: string
	updated_at: string
}

export interface ChatContent {
	id?: string
	role: 'user' | 'agent'
	content: string
}
