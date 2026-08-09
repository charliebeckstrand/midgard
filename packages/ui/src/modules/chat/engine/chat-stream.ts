/**
 * The rule that folds one transport chunk into the reply it is building.
 *
 * A transport yields two kinds of chunk, and each means something different. A
 * string is the whole reply's prose so far, so it replaces; a part list is the
 * blocks that changed, so it merges. Both fold into the same content, which is
 * what lets one reply hold prose that streams beside a chart that arrives once.
 *
 * No rule here reads a clock or a random source. A chunk names every block it
 * carries, and the reply names the running text with a fixed id, so a fold is
 * decided by the ids in front of it and a test can state every case.
 */

import { TEXT_PART_ID, toChatParts } from './chat-content/normalize'
import type { ChatPart, ChatTextPart } from './chat-content/types'

/**
 * The blocks a merge starts from.
 *
 * An opened reply holds an empty string, which normalizes to one empty text
 * part. A merge must start from no blocks instead, or the first chart to land
 * would draw under a blank text block that no chunk ever wrote.
 *
 * @internal
 */
function startingParts(content: string | ChatPart[]): ChatPart[] {
	return content === '' ? [] : toChatParts(content)
}

/**
 * The blocks with the running text set to `text`: replaced where the reply
 * already holds it, and appended where it does not.
 *
 * One name, so a string chunk that arrives after a chart neither deletes that
 * chart nor opens a second running text. The replacement holds its position,
 * because a block's place in the reply is not the transport's to change.
 *
 * @internal
 */
function setRunningText(parts: ChatPart[], text: string): ChatPart[] {
	const running: ChatTextPart = { kind: 'text', id: TEXT_PART_ID, text }

	const at = parts.findIndex((part) => part.id === TEXT_PART_ID)

	return at === -1 ? [...parts, running] : parts.with(at, running)
}

/**
 * The blocks with every arriving block folded in by id: one that names a block
 * already held replaces it in place, and one that names a new block joins the
 * end, in the order the chunk lists them.
 *
 * By id, and never by index. An insertion moves every position after it, so a
 * positional fold would write the arriving block over an unrelated one from the
 * first insertion onward. A block that arrives twice in one chunk keeps the
 * first block's place and the last block's content.
 *
 * A whole block replaces a whole block, rather than its fields merging. A tool
 * call that turns from running to done sends the block it has become, and a
 * field-wise merge would leave the fields it dropped standing.
 *
 * A `Map` keyed by id is the whole rule: it holds insertion order, a `set` on a
 * key it already holds writes in place, and a `set` on a new one appends. Every
 * clause above falls out of that, including the block named twice — and so does
 * one the old two-structure form did not state, that a reply holding two blocks
 * under one id folds to one, which is the right end for an address.
 *
 * @internal
 */
function mergeParts(parts: ChatPart[], arriving: ChatPart[]): ChatPart[] {
	const merged = new Map(parts.map((part) => [part.id, part]))

	for (const part of arriving) merged.set(part.id, part)

	return [...merged.values()]
}

/**
 * The reply's content with one chunk folded into it.
 *
 * A string chunk is cumulative prose — the whole reply so far — so it replaces
 * the running text and nothing else. A reply that is still a string stays one,
 * which is what keeps a transcript of prose allocating no part list and
 * rendering exactly as it did before a reply could hold blocks.
 *
 * A part-list chunk carries the blocks that changed, and it merges by id, so a
 * chart that arrives after two paragraphs discards neither of them.
 *
 * @internal
 * @param content - The reply so far: a plain string, or the blocks it holds.
 * @param chunk - What the transport just yielded.
 */
export function applyChunk(
	content: string | ChatPart[],
	chunk: string | ChatPart[],
): string | ChatPart[] {
	if (typeof chunk === 'string') {
		return typeof content === 'string' ? chunk : setRunningText(content, chunk)
	}

	return mergeParts(startingParts(content), chunk)
}

/**
 * The reply's content with every step still marked running marked failed —
 * what a stream that ended owes any step it opened and never closed.
 *
 * Returns the content it read, by reference, when nothing was running. A reply
 * of prose takes the string arm and never allocates, which is what lets the
 * shell run this after every send rather than only after one that ran a step.
 *
 * Failed, and not some third state for a stop. The transport is what knows a
 * call succeeded, and a call the reader stopped produced no result it can be
 * asked for; naming that anything else would leave the reader to guess whether
 * the answer above it used the step's output.
 *
 * @internal
 * @param content - The reply as the stream left it.
 */
export function failRunningTools(content: string | ChatPart[]): string | ChatPart[] {
	if (typeof content === 'string') return content

	let changed = false

	const settled = content.map((part) => {
		if (part.kind !== 'tool' || part.status !== 'running') return part

		changed = true

		return { ...part, status: 'failed' as const }
	})

	return changed ? settled : content
}
