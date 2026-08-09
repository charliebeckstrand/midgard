'use client'

import type { ReactNode } from 'react'
import { createContext } from '../../core'
import type { Mount } from '../../primitives/mount'
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
	/**
	 * When a renderer is mounted, relative to the reader reaching it.
	 *
	 * @remarks
	 * `lazy` — the default — holds a renderer back until its block is near the
	 * viewport, then keeps it. A transcript's embeds are mostly scrolled away
	 * above the newest reply, and a view is the most expensive thing a reply can
	 * carry: a bar chart on every reply of a 500-message transcript measured
	 * 1,383 ms to mount against 300 ms for the same transcript carrying none.
	 *
	 * `always` mounts every renderer up front, for a caller who would rather pay
	 * that than reserve space for one. `active` unmounts a renderer that scrolls
	 * away, trading a remount — and whatever state the view held — for the
	 * memory of a long transcript.
	 *
	 * Where nothing can observe the viewport, every policy mounts eagerly: the
	 * gate is an optimization, and the safe answer when the environment cannot
	 * tell is to draw.
	 *
	 * @defaultValue 'lazy'
	 */
	mount?: Mount
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
