'use client'

import { createContext } from '../../core/create-context'

/**
 * The text that one render of a {@link Markdown} drew for each range, by the
 * `id` of the range.
 *
 * @internal
 */
export type MarkdownRangeTexts = Readonly<Record<string, string>>

/**
 * The text of each range that the nearest render drew, or `null` outside a
 * render that draws ranges through a caller's `renderRange`.
 *
 * @internal
 */
export const [MarkdownRangeTextContext, useMarkdownRangeTexts] =
	createContext<MarkdownRangeTexts | null>('MarkdownRangeText', { default: null })
