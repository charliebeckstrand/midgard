'use client'

import { createContext } from '../../core'

/**
 * True when a {@link ChatListItem} renders inside a {@link ChatList}. The list
 * owns the roving-tabindex keyboard model; an item reads this to take
 * `role="listitem"` (paired with the list's `role="list"`) when nested.
 */
export const [ChatListContext, useChatList] = createContext<boolean>('ChatList', {
	default: false,
})
