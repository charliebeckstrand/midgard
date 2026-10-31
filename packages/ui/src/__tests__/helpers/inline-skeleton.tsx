import type { ReactNode } from 'react'
import { renderToString } from 'react-dom/server'
import { expect, vi } from 'vitest'
import { getSlot } from './slot-queries'

/**
 * Checks that a skeleton can stand in a line of text. The check renders the
 * skeleton in a paragraph as server markup, and parses the markup back, as a
 * browser does. A `div` in a `<p>` makes the parser close the paragraph there,
 * and the tree that React hydrates then does not match. Thus the placeholder
 * must be a `span` that stays in the paragraph.
 *
 * @param skeleton - The skeleton element, such as `<BadgeSkeleton size="sm" />`.
 * @returns The placeholder, so that a case can check its classes.
 */
export const expectInlineSkeleton = vi.defineHelper((skeleton: ReactNode): HTMLElement => {
	const container = document.createElement('div')

	container.innerHTML = renderToString(<p>A line of text {skeleton}</p>)

	const placeholder = getSlot(container, 'placeholder')

	expect(placeholder.tagName).toBe('SPAN')

	expect(placeholder.parentElement?.tagName).toBe('P')

	return placeholder
})
