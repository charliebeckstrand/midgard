'use client'

import { useCallback, useRef } from 'react'
import type { ChatMessageData } from './engine/types'

/**
 * Returns the key getter that the transcript window reads: the message `id`,
 * or the index for a message with no id.
 *
 * @remarks
 * The getter keeps its identity while the ids stay the same. A streamed chunk
 * gives a new message list with the same ids, so the getter does not change.
 * A new identity makes the virtualizer rebuild the position of every row.
 *
 * An added, removed or moved message, or an id that changes in place, gives a
 * new getter. The virtualizer then rebuilds its rows, also when the count does
 * not change.
 *
 * The ref holds a cache of a pure result. A render that React discards thus
 * leaves no wrong value in it.
 *
 * @internal
 */
export function useChatTranscriptItemKey(
	messages: readonly ChatMessageData[],
): (index: number) => string | number {
	const cache = useRef<readonly (string | undefined)[]>([])

	const last = cache.current

	const same =
		last.length === messages.length && messages.every((message, i) => message.id === last[i])

	if (!same) cache.current = messages.map((message) => message.id)

	const ids = cache.current

	return useCallback((index: number) => ids[index] ?? index, [ids])
}
