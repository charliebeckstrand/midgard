'use client'

import type { ReactNode } from 'react'
import { MarkdownRangeTextContext, type MarkdownRangeTexts } from './context'

/**
 * Gives the pieces of a render the text of each range. The renderer draws it
 * around its output after the walk, so the text of each range is whole when a
 * piece reads it: React renders a child after its parent returns.
 *
 * @internal
 */
export function MarkdownRangeTextProvider({
	texts,
	children,
}: {
	texts: MarkdownRangeTexts
	children: ReactNode
}) {
	return <MarkdownRangeTextContext value={texts}>{children}</MarkdownRangeTextContext>
}
