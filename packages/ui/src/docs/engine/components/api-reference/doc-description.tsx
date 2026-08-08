'use client'

import { Markdown } from '../../../../components/markdown'
import { linksToMarkdown } from '../../api-reference/link-syntax'

/**
 * Renders an API-reference description as block Markdown, resolving the
 * `{@link}` tokens the extractor leaves in the text first: a symbol reference
 * collapses to its bare name (no chip, no hover card), an external URL becomes a
 * Markdown link. Resolving up front keeps the whole description on one
 * block-Markdown pass, so its paragraphs, lists, and fenced code survive — a
 * per-link inline pass would flatten that block markup.
 */
export function DocDescription({
	description,
	className,
}: {
	description?: string
	className?: string
}) {
	if (!description) return null

	return <Markdown className={className}>{linksToMarkdown(description)}</Markdown>
}
