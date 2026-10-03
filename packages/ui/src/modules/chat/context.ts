'use client'

import { createContext } from '../../core'
import type { ChatEmbedRegistry } from './types'

/**
 * True when a {@link ChatListItem} renders inside a {@link ChatList}. The list
 * owns the roving-tabindex keyboard model; an item reads this to take
 * `role="listitem"` (paired with the list's `role="list"`) when nested.
 */
export const [ChatListContext, useInChatList] = createContext<boolean>('ChatList', {
	default: false,
})

/**
 * The registry as the context carries it, with the memory of the embeds a
 * reader has reached.
 *
 * @remarks
 * `reached` holds one address for each embed that came into view. The
 * outermost {@link ChatEmbedProvider} owns it, so it outlives a row that a
 * windowed transcript unmounts. A returning embed then draws at once and does
 * not defer a second time. It is not a prop, because only the provider writes it.
 *
 * @internal
 */
export type ChatEmbedScope = ChatEmbedRegistry & {
	/** Addresses of the embeds a reader has reached. Absent with no provider above. */
	reached?: Set<string>
}

/** The registry with nothing in it: every embed falls back. @internal */
const NO_EMBEDS: ChatEmbedScope = { renderers: {} }

/**
 * The embed renderers in scope, as {@link ChatEmbedProvider} supplied them.
 *
 * Optional context with an empty default, and never a throw. A transcript of
 * prose is the common case and must not need a provider. A transcript that does
 * hold an embed states the missing renderer in the bubble. That reaches the
 * reader who can see the gap, rather than only the developer who reads a stack
 * trace.
 *
 * @internal
 */
export const [ChatEmbedContext, useChatEmbeds] = createContext<ChatEmbedScope>(
	'ChatEmbedProvider',
	{ default: NO_EMBEDS },
)

/**
 * The key of the transcript row that holds a message, or `undefined` outside a
 * {@link ChatTranscript}.
 *
 * @remarks
 * A part id is unique in its message and not in the transcript. An embed
 * therefore joins this key to its part id to get an address in the transcript.
 * A {@link ChatMessage} with no transcript around it has no row, so it keeps
 * no memory across a remount.
 *
 * @internal
 */
export const [ChatRowContext, useChatRowKey] = createContext<string | number | undefined>(
	'ChatTranscriptRow',
	{ default: undefined },
)
