export interface User {
	email: string
	name?: string
}

export interface Chat {
	id: string
	title: string
}

export interface ChatMessage {
	role: 'user' | 'agent'
	message: string
}

export interface ClientChatMessage extends ChatMessage {
	id: string
	pending?: boolean
}
