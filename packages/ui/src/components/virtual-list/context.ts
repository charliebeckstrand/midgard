'use client'

import type { Virtualizer } from '@tanstack/react-virtual'
import { createContext as reactCreateContext, useContext } from 'react'

export type ChatScrollContextValue = {
	/** Called by VirtualList to register its scroll container and virtualizer. */
	register: (container: HTMLDivElement, virtualizer: Virtualizer<HTMLDivElement, Element>) => void
	/** Where VirtualList should anchor its initial scroll position. */
	initialAnchor: 'start' | 'end'
}

const ChatScrollContext = reactCreateContext<ChatScrollContextValue | null>(null)

export const ChatScrollProvider = ChatScrollContext.Provider

/**
 * Returns the ChatScroll context if a <ChatScroll> ancestor exists,
 * or `null` otherwise. VirtualList checks this to decide whether to
 * apply chat-specific behavior.
 */
export function useChatScrollContext(): ChatScrollContextValue | null {
	return useContext(ChatScrollContext)
}
