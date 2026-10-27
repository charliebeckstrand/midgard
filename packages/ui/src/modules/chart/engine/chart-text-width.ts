/** The rendered width, in px, of one label string. @internal */
export type TextWidth = (text: string) => number

/** The mark that ends a label cut to fit its room. @internal */
export const ELLIPSIS = '…'

/** A label as it draws: its text, cut with an {@link ELLIPSIS} when it is too wide, and its width. @internal */
export type TextFit = { text: string; width: number }

/**
 * Splits a text into the characters that a reader sees. The grapheme rules of
 * Unicode are the same in each language, so the root locale (`und`) serves
 * every chart.
 *
 * @internal
 */
const graphemes = new Intl.Segmenter('und', { granularity: 'grapheme' })

/**
 * The end of each character of `text` that a reader sees, as a code unit
 * offset, in order. A cut at one of them keeps each character whole: an emoji
 * that two code units hold, or a flag of two regional letters.
 *
 * @internal
 */
export function graphemeEnds(text: string): number[] {
	return Array.from(graphemes.segment(text), ({ index, segment }) => index + segment.length)
}

/** The start of `text` to its last whole character at or before `length` code units. @internal */
function cutText(text: string, length: number): string {
	const end = graphemeEnds(text).findLast((offset) => offset <= length) ?? 0

	return `${text.slice(0, end).trimEnd()}${ELLIPSIS}`
}

/**
 * The estimated {@link TextFit} of `text` in `maxWidth`, at `charWidth` for each
 * code unit. It keeps as many whole characters as fit with the
 * {@link ELLIPSIS}. It is the fallback before a measurement: on the server, in
 * the first client render, and where the DOM has no SVG text layout (jsdom).
 *
 * @internal
 */
export function estimateTextFit(text: string, charWidth: number, maxWidth: number): TextFit {
	const width = text.length * charWidth

	if (width <= maxWidth) return { text, width }

	const cut = cutText(text, Math.max(0, Math.floor(maxWidth / charWidth) - 1))

	return { text: cut, width: cut.length * charWidth }
}
