import { TEXT_PART_ID } from '../chat-content/normalize'
import type { ChatCitation, ChatPart } from '../chat-content/types'

/**
 * The one rule for what a composer holds to send. `ChatPrompt` and
 * `useChatDraft` both read it, so the two cannot disagree about the same draft.
 * The component adds only its own `disabled` test above it.
 */

/**
 * The content a draft sends: the value without its surrounding whitespace. An
 * empty result states that the draft holds nothing to send.
 *
 * @internal
 */
export function draftContent(value: string): string {
	return value.trim()
}

/**
 * Whether a draft holds something to send: {@link draftContent} as the boolean
 * a send control reads.
 *
 * @internal
 */
export function canSubmitDraft(value: string): boolean {
	return draftContent(value) !== ''
}

/**
 * The citations of a draft, with offsets into {@link draftContent} of the
 * value. The trim removes the whitespace before the text, so each offset moves
 * back by that length. A citation that the trim cuts, or whose quote is not at
 * its address, goes.
 *
 * The result is the same array when no citation changes, so a trimmed draft
 * gives back what it got.
 *
 * @internal
 */
export function draftCitations(
	value: string,
	citations: readonly ChatCitation[],
): readonly ChatCitation[] {
	if (citations.length === 0) return citations

	const text = draftContent(value)

	const lead = value.length - value.trimStart().length

	if (lead === 0 && text.length === value.length) return keepQuoted(value, citations)

	return citations.flatMap((citation) => {
		const start = citation.start - lead

		const end = citation.end - lead

		if (start < 0 || end > text.length || text.slice(start, end) !== citation.quote) return []

		return [{ ...citation, start, end }]
	})
}

/**
 * The citations whose quote is at their address in `value`. The result is the
 * same array when each one is there.
 *
 * @internal
 */
export function keepQuoted(
	value: string,
	citations: readonly ChatCitation[],
): readonly ChatCitation[] {
	const kept = citations.filter(
		(citation) => value.slice(citation.start, citation.end) === citation.quote,
	)

	return kept.length === citations.length ? citations : kept
}

/**
 * What a user message holds when it is sent. Text with no citation stays a
 * string, so a transcript of prose does not change. Text with citations is one
 * text part under the fixed name, which is the part that a string normalizes
 * to, with the citations on it.
 *
 * The citations are constructed and not parsed: they come from the composer,
 * never from the text. Thus a reader cannot type one.
 *
 * @internal
 * @param text - The trimmed text, as {@link draftContent} gives it.
 * @param citations - The citations of the text, as {@link draftCitations} gives them.
 */
export function userContent(text: string, citations: readonly ChatCitation[]): string | ChatPart[] {
	return citations.length === 0
		? text
		: [{ kind: 'text', id: TEXT_PART_ID, text, citations: [...citations] }]
}
