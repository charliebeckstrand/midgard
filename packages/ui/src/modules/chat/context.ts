'use client'

import type { ReactNode } from 'react'
import { createContext } from '../../core'
import type { ChatEmbedPart } from './engine/chat-content/types'

/**
 * True when a {@link ChatListItem} renders inside a {@link ChatList}. The list
 * owns the roving-tabindex keyboard model; an item reads this to take
 * `role="listitem"` (paired with the list's `role="list"`) when nested.
 */
export const [ChatListContext, useInChatList] = createContext<boolean>('ChatList', {
	default: false,
})

/**
 * Draws one {@link ChatEmbedPart}. The part reaches the renderer whole, so a
 * renderer reads `data` as its own shape and `id` as the block's address.
 *
 * `data` arrives as `unknown`, because the chat cannot know what a caller
 * embedded. The cast belongs here, at the registration, where the name and the
 * payload are agreed.
 *
 * @example
 *   const renderers = { revenue: (part) => <BarChart {...(part.data as RevenueData)} /> }
 */
export type ChatEmbedRenderer = (part: ChatEmbedPart) => ReactNode

/**
 * The renderers a transcript can draw, by embed name, and the fallback for a
 * name none of them claims.
 */
export type ChatEmbedRegistry = {
	/** Renderers by embed name. A name absent here falls to {@link ChatEmbedRegistry.fallback}. */
	renderers: Readonly<Record<string, ChatEmbedRenderer>>
	/** Draws a part whose `name` no renderer claims. Absent draws the module's own stated fallback. */
	fallback?: ChatEmbedRenderer
}

/** The registry with nothing in it: every embed falls back. @internal */
const NO_EMBEDS: ChatEmbedRegistry = { renderers: {} }

/**
 * The embed renderers in scope, as {@link ChatEmbedProvider} supplied them.
 *
 * Optional context with an empty default, and never a throw. A transcript of
 * prose is the common case and must not need a provider; a transcript that does
 * hold an embed states the missing renderer in the bubble, which reaches the
 * reader who can see the gap rather than only the developer who reads a stack
 * trace.
 *
 * @internal
 */
export const [ChatEmbedContext, useChatEmbeds] = createContext<ChatEmbedRegistry>(
	'ChatEmbedProvider',
	{ default: NO_EMBEDS },
)
