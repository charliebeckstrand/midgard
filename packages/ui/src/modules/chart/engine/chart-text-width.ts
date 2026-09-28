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
