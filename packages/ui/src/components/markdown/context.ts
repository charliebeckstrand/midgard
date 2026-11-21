'use client'

import { createContext } from '../../core/create-context'

/**
 * The text that one render of a {@link Markdown} drew for each range, by the
 * `start` of the range. The ranges that draw do not overlap, so no two share a
 * `start`. An `id` can repeat, and an object key does not stay the same object
 * when a server render sends the value to the client.
 *
 * @internal
 */
export type MarkdownRangeTexts = Readonly<Record<number, string>>

/**
 * The text of each range that the nearest render drew, or `null` outside a
 * render that draws ranges through a caller's `renderRange`.
 *
 * @internal
 */
export const [MarkdownRangeTextContext, useMarkdownRangeTexts] =
	createContext<MarkdownRangeTexts | null>('MarkdownRangeText', { default: null })
