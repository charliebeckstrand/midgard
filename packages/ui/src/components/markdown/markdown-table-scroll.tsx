'use client'

import type { ReactNode } from 'react'
import { cn } from '../../core'
import { useScrollRegion } from '../../hooks/use-scroll-region'
import { defineMessages } from '../../primitives/intl/intl-messages'
import { useIntl } from '../../primitives/intl/use-intl'
import { k } from '../../recipes/kata/markdown'

const messages = defineMessages({
	table: {
		id: 'ui.markdown.table',
		defaultMessage: 'Table',
		description: 'The name of the scroll box of a wide table in a Markdown document.',
	},
})

/**
 * The inline scroll box of a table in {@link Markdown}. A table that is wider
 * than the prose scrolls in this box, and the container of the prose does not
 * scroll. While the table overflows, the box is a tab stop and a region named
 * "Table", in the language of the reader ({@link useScrollRegion}). It is the one client part of a table, as
 * `CodeBlock` is of a fenced block.
 *
 * @internal
 */
export function MarkdownTableScroll({ children }: { children: ReactNode }) {
	const intl = useIntl()

	const scrollRegionRef = useScrollRegion({ label: intl.formatMessage(messages.table) })

	return (
		<div ref={scrollRegionRef} className={cn(k.tableScroll)}>
			{children}
		</div>
	)
}
