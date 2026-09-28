'use client'

import { useCallback } from 'react'
import { useStableValue } from '../../hooks/use-stable-value'
import type { ChatMessageData } from './engine/types'

/** Whether two message lists hold the same ids in the same order. @internal */
function sameIds(previous: readonly ChatMessageData[], next: readonly ChatMessageData[]): boolean {
	return (
		previous.length === next.length && next.every((message, i) => message.id === previous[i]?.id)
	)
}

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
 * @internal
 */
export function useChatTranscriptItemKey(
	messages: readonly ChatMessageData[],
): (index: number) => string | number {
	// The held list keeps the ids of the messages, so the getter reads only ids
	// from it.
	const held = useStableValue(messages, sameIds)

	return useCallback((index: number) => held[index]?.id ?? index, [held])
}
