import type { ChatPart } from './types'

/**
 * The id of the one text part a string normalizes to.
 *
 * A fixed name, and not a minted one, because the engine mints no id and reads
 * no random source. A message that holds a string holds one block, so one name
 * is enough, and no two messages share a part list.
 *
 * The fixed name also makes a cumulative snapshot unambiguous. Increment 5
 * replaces the text this name points to, so a string chunk that arrives after a
 * chart can neither delete that chart nor open a second running text.
 *
 * @internal
 */
export const TEXT_PART_ID = 'text'

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
	return typeof content === 'string' ? [{ kind: 'text', id: TEXT_PART_ID, text: content }] : content
}

/**
 * Whether one part holds nothing yet. The switch holds every kind and has no
 * default arm, so a kind added later must state what empty means for it, and
 * the compiler asks. This is the rule `partText` already stands on.
 *
 * @internal
 */
function isEmptyPart(part: ChatPart): boolean {
	switch (part.kind) {
		case 'text':
			return part.text === ''
		// An embed holds something the moment it names a renderer. It draws no
		// prose, so the projection reads it as nothing; the rollback must not, or a
		// reply that arrived as a chart alone would be discarded as an empty one.
		case 'embed':
			return false
		// A step holds something the moment it names what ran, which it always
		// does. A reply that opened with a running query and then failed is not an
		// empty reply — it is a reply that shows the query it was running.
		case 'tool':
			return false
	}
}

/**
 * Whether the content holds nothing yet. `dropEmptyReply` reads this to roll a
 * failed send back.
 *
 * The rule reads the structure, and never the plain-text projection. The
 * projection drops a part that projects to nothing, so a reply that holds only
 * an embedded chart projects to an empty string. A rule that read the
 * projection would then discard a reply that had already started.
 *
 * @internal
 * @param content - The message content: a plain string, or a part list.
 */
export function isEmptyContent(content: string | ChatPart[]): boolean {
	return typeof content === 'string' ? content === '' : content.every(isEmptyPart)
}
