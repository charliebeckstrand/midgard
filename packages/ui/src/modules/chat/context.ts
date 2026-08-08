'use client'

import { createContext } from '../../core'

/**
 * True when a {@link ChatListItem} renders inside a {@link ChatList}. The list
 * owns the roving-tabindex keyboard model; an item reads this to take
 * `role="listitem"` (paired with the list's `role="list"`) when nested.
 *
 * @remarks
 * The name states a nesting fact rather than list state: it answers "am I in a
 * list?", and it reads nothing about the list itself.
 */
export const [ChatListContext, useInChatList] = createContext<boolean>('ChatList', {
	default: false,
})
