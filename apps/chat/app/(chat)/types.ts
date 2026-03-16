export interface Chat {
	id: string
	title: string
}

export interface ChatMessage {
	role: 'user' | 'agent'
	content: string
}

export interface ClientChatMessage extends ChatMessage {
	id: string
	pending?: boolean
}
