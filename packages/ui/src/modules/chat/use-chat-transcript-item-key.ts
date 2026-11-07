'use client'

import { useCallback } from 'react'
import { useStableValue } from '../../hooks/use-stable-value'
import { sameBranches } from './engine/chat-branch/tree'
import type { ChatBranch } from './engine/chat-branch/types'
import { hasMessageId } from './engine/chat-transcript'
import type { ChatMessageData } from './engine/types'

/** Whether two message lists hold the same ids in the same order. @internal */
function sameIds(prev: readonly ChatMessageData[], next: readonly ChatMessageData[]): boolean {
	return prev.length === next.length && next.every((message, i) => message.id === prev[i]?.id)
}

/** The branches of a transcript with no fork. @internal */
const NO_BRANCHES: Readonly<Record<string, ChatBranch>> = {}

/**
 * Returns the key getter that the transcript window reads: the message `id`,
 * or the index for a message with no id. An empty id is no id, as the engine
 * reads it. A message with branches takes the id of its oldest branch, so each
 * branch at one place has the same row.
 *
 * @remarks
 * The getter keeps its identity while the ids and the branches stay the same.
 * A streamed chunk gives a new message list with the same ids, so the getter
 * does not change. A new identity makes the virtualizer rebuild the position
 * of every row.
 *
 * An added, removed or moved message, an id that changes in place, or a change
 * of the branches gives a new getter. The virtualizer then rebuilds its rows,
 * also when the count does not change. A switch to another branch keeps the
 * key of that row, and it changes the keys of the rows below it.
 *
 * @internal
 */
export function useChatTranscriptItemKey(
	messages: readonly ChatMessageData[],
	branches: Readonly<Record<string, ChatBranch>> = NO_BRANCHES,
): (index: number) => string | number {
	// The held list keeps the ids of the messages, so the getter reads only ids
	// from it. The getter reads the branches only when the virtualizer asks for a
	// key, and not on each chunk.
	const held = useStableValue(messages, sameIds)

	const heldBranches = useStableValue(branches, sameBranches)

	return useCallback(
		(index: number) => {
			const message = held[index]

			if (!message || !hasMessageId(message)) return index

			return heldBranches[message.id]?.ids[0] || message.id
		},
		[held, heldBranches],
	)
}
