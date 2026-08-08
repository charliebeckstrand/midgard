import type { ChatPart } from './types'

/**
 * A message's content as parts. A `string` becomes exactly one text part, so a
 * caller keeps the transcript of strings it holds and rewrites nothing. A part
 * list passes through by reference, so a memoized bubble reads the same array
 * it got.
 *
 * An empty string becomes one empty text part, not an empty list. The
 * transcript opens an empty reply while an answer arrives, and that reply holds
 * one block with nothing in it yet.
 *
 * @internal
 * @param content - The message content: a plain string, or a part list.
 */
export function toChatParts(content: string | ChatPart[]): ChatPart[] {
	return typeof content === 'string' ? [{ kind: 'text', text: content }] : content
}
