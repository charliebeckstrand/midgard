'use client'

import { useCallback, useState } from 'react'
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
 * The ids are state that the render adjusts when they change. React discards
 * the render that sets the state, and renders again before it commits.
 *
 * @internal
 */
export function useChatTranscriptItemKey(
	messages: readonly ChatMessageData[],
): (index: number) => string | number {
	const [ids, setIds] = useState<readonly (string | undefined)[]>(() =>
		messages.map((message) => message.id),
	)

	const same =
		ids.length === messages.length && messages.every((message, i) => message.id === ids[i])

	if (!same) setIds(messages.map((message) => message.id))

	return useCallback((index: number) => ids[index] ?? index, [ids])
}
