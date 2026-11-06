import type { ChatPart } from './types'

/**
 * Markdown separates two blocks with a blank line, and so does a projection of
 * two parts.
 *
 * @internal
 */
export const BLOCK_SEPARATOR = '\n\n'

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
		// An embed is a view and not prose. Its renderer holds the text (a chart
		// ships its own data table) and this projection cannot reach it, so a
		// guess here would put a name the reader never saw into the clipboard, the
		// search index, and the announcement. Nothing is the honest answer.
		case 'embed':
			return ''
		// A step is already prose, which is what separates it from an embed: the
		// module wrote the line, so the clipboard, the search index, and the
		// announcement can all have it. The detail stays out: it is the body
		// behind a disclosure the reader has not opened.
		case 'tool':
			return part.summary ? `${part.label}: ${part.summary}` : part.label
	}
}

/**
 * A part list as one plain-text string. Three readers take a message in this
 * form: copy, conversation search, and the screen-reader announcement. The
 * projection is therefore one named function, and not a `map` and a `join` at
 * each of the three call sites.
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
 * The content of a message as plain text, from either arm. A string is its own
 * projection. A part list gives each text part, and each step as its label and
 * summary, with a blank line between two blocks. An embed gives nothing,
 * because its renderer holds its text.
 *
 * Use it for the copy action of a message. `retry` sends the same text to the
 * transport, and the announcement speaks it. Thus the clipboard, the
 * transport, and the screen reader get the same text.
 *
 * @param content - The message content: a plain string, or a part list.
 * @returns The plain text of the content.
 */
export function chatContentText(content: string | ChatPart[]): string {
	return typeof content === 'string' ? content : chatPartsText(content)
}
