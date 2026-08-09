import type { ChatPart } from './types'

/** Markdown separates two blocks with a blank line, and so does a projection of two parts. @internal */
const BLOCK_SEPARATOR = '\n\n'

/**
 * One part as plain text. The switch holds every kind. A kind added later
 * returns nothing here, and the compiler reports it, so a new kind cannot join
 * the projection as silence.
 *
 * @internal
 */
function partText(part: ChatPart): string {
	switch (part.kind) {
		case 'text':
			return part.text
	}
}

/**
 * A part list as one plain-text string. The roadmap names three readers of a
 * message in this form: copy, conversation search, and the screen-reader
 * announcement. The projection is therefore one named function, and not a
 * `map` and a `join` at each of the three call sites.
 *
 * Each part projects to its own text, and a blank line joins the results.
 * Markdown puts the same blank line between two blocks. A part that projects to
 * nothing drops out first, so it leaves no blank gap.
 *
 * One part alone projects to its own text and nothing else. That holds the
 * round trip: a string normalizes to one text part, and the part projects back
 * to the same bytes.
 *
 * @internal
 * @param parts - The message's parts, in the order the transcript draws them.
 */
export function chatPartsText(parts: ChatPart[]): string {
	return parts
		.map(partText)
		.filter((text) => text !== '')
		.join(BLOCK_SEPARATOR)
}

/**
 * The content as plain text, from either arm. A string is its own projection,
 * so a transcript of strings reads byte for byte as it does today.
 *
 * `retry` sends this to the transport, and the bubble draws it. One named
 * function keeps the two readers from drifting apart.
 *
 * @param content - The message content: a plain string, or a part list.
 */
export function chatContentText(content: string | ChatPart[]): string {
	return typeof content === 'string' ? content : chatPartsText(content)
}
