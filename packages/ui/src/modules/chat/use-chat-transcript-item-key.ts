'use client'

import { useCallback } from 'react'
import { useStableValue } from '../../hooks/use-stable-value'
import { sameElements } from '../../utilities/same-elements'
import type { ChatBranch } from './engine/chat-branch/types'
import { hasMessageId } from './engine/chat-transcript'
import type { ChatMessageData } from './engine/types'

/**
 * The key of the row of a message: the id of its oldest branch, else its own
 * id, else `undefined` for a message with no id. @internal
 */
function rowKey(
	message: ChatMessageData,
	branches: Readonly<Record<string, ChatBranch>> | undefined,
): string | undefined {
	if (!hasMessageId(message)) return undefined

	return branches?.[message.id]?.ids[0] || message.id
}

/**
 * Returns the key getter that the transcript window reads: the message `id`,
 * or the index for a message with no id. An empty id is no id, as the engine
 * reads it. A message with branches takes the id of its oldest branch, so each
 * branch at one place has the same row.
 *
 * @remarks
 * The getter keeps its identity while the keys stay the same. A streamed chunk
 * gives a new message list with the same ids, so the getter does not change.
 * A new identity makes the virtualizer rebuild the position of every row.
 *
 * An added, removed or moved message, or a key that changes in place, gives a
 * new getter. The virtualizer then rebuilds its rows, also when the count does
 * not change. A switch to another branch keeps the key of that row, and it
 * changes the keys of the rows below it.
 *
 * @internal
 */
export function useChatTranscriptItemKey(
	messages: readonly ChatMessageData[],
	branches?: Readonly<Record<string, ChatBranch>>,
): (index: number) => string | number {
	const held = useStableValue(
		messages.map((message) => rowKey(message, branches)),
		sameElements,
	)

	return useCallback((index: number) => held[index] ?? index, [held])
}
