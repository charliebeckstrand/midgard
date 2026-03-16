'use client'

import { createContext, useContext } from 'react'

interface ChatContextValue {
	activeChatId: string | null
	isDraft: boolean
	openChat: (chatId: string) => void
	openDraft: () => void
	refreshChats: () => void
}

export const ChatContext = createContext<ChatContextValue>({
	activeChatId: null,
	isDraft: false,
	openChat: () => {},
	openDraft: () => {},
	refreshChats: () => {},
})

export function useChatContext() {
	return useContext(ChatContext)
}
