/** The rendered width, in px, of one label string. @internal */
export type TextWidth = (text: string) => number

/**
 * A {@link TextWidth} that multiplies the character count by a per-glyph
 * advance. It is the fallback before a measurement: on the server, in the
 * first client render, and where the DOM has no SVG text layout (jsdom).
 *
 * @internal
 */
export function estimateTextWidth(charWidth: number): TextWidth {
	return (text) => text.length * charWidth
}

/** The mark that ends a label cut to fit its room. @internal */
export const ELLIPSIS = '…'

/** A label as it draws: its text, cut with an {@link ELLIPSIS} when it is too wide, and its width. @internal */
export type TextFit = { text: string; width: number }

/**
 * The estimated {@link TextFit} of `text` in `maxWidth`, at `charWidth` for each
 * character. It keeps as many characters as fit with the {@link ELLIPSIS}. It is
 * the fallback before a measurement, as {@link estimateTextWidth} is.
 *
 * @internal
 */
export function estimateTextFit(text: string, charWidth: number, maxWidth: number): TextFit {
	const width = text.length * charWidth

	if (width <= maxWidth) return { text, width }

	const kept = Math.max(0, Math.floor(maxWidth / charWidth) - 1)

	const cut = `${text.slice(0, kept).trimEnd()}${ELLIPSIS}`

	return { text: cut, width: cut.length * charWidth }
}
