'use client'

import { useMarkdownRangeTexts } from './context'
import type { MarkdownRange } from './markdown-ranges'

/**
 * The text that the nearest {@link Markdown} drew for a range: the text of
 * each piece, in order, as a reader sees it. Call it in a component that
 * `renderRange` draws, such as the control on piece 0 of a range, to give that
 * control the whole phrase as its name.
 *
 * @remarks
 * A range that crosses inline formatting or a block boundary draws as more
 * than one piece, and piece 0 holds only its own text. This hook gives the
 * text of all the pieces. Two pieces join with one space where the source
 * between them holds white space, such as a line break or a block boundary,
 * and join directly elsewhere, such as across bold in a word. Runs of white
 * space read as one space.
 *
 * @param range - The range of the piece, as `renderRange` got it.
 * @returns The text of the range, or `undefined` outside a render that drew it.
 * @example
 *   function Anchor({ piece, children }: { piece: MarkdownRangePiece; children: ReactNode }) {
 *     const name = useMarkdownRangeText(piece.range)
 *
 *     return piece.index === 0 ? <button type="button" aria-label={name}>{children}</button> : children
 *   }
 */
export function useMarkdownRangeText(range: MarkdownRange): string | undefined {
	return useMarkdownRangeTexts()?.[range.start]
}
