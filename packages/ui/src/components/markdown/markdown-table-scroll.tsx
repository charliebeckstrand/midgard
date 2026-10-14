'use client'

import type { ReactNode } from 'react'
import { cn } from '../../core'
import { useScrollRegion } from '../../hooks/use-scroll-region'
import { k } from '../../recipes/kata/markdown'

/**
 * The inline scroll box of a table in {@link Markdown}. A table that is wider
 * than the prose scrolls in this box, and the container of the prose does not
 * scroll. While the table overflows, the box is a tab stop and a region named
 * "Table" ({@link useScrollRegion}). It is the one client part of a table, as
 * `CodeBlock` is of a fenced block.
 *
 * @internal
 */
export function MarkdownTableScroll({ children }: { children: ReactNode }) {
	const scrollRegionRef = useScrollRegion({ label: 'Table' })

	return (
		<div ref={scrollRegionRef} className={cn(k.tableScroll)}>
			{children}
		</div>
	)
}
