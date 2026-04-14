'use client'

import type { Virtualizer } from '@tanstack/react-virtual'
import { createContext as reactCreateContext, useContext } from 'react'

export type ChatScrollContextValue = {
	/** Registers the scroll container and virtualizer. */
	register: (container: HTMLDivElement, virtualizer: Virtualizer<HTMLDivElement, Element>) => void
	/** Initial scroll anchor. */
	initialAnchor: 'start' | 'end'
}

const ChatScrollContext = reactCreateContext<ChatScrollContextValue | null>(null)

export const ChatScrollProvider = ChatScrollContext.Provider

/** Returns the ChatScroll context, or null outside a ChatScroll. */
export function useChatScrollContext(): ChatScrollContextValue | null {
	return useContext(ChatScrollContext)
}
