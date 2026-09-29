'use client'

import { Markdown } from '../../../../components/markdown'
import { linksToMarkdown } from '../../api-reference/link-syntax'

/**
 * Split a description at its first blank line. The summary is the first
 * paragraph. The detail is the rest. A description that opens with a code fence
 * is one block, so it does not split.
 */
export function splitDescription(description: string): { summary: string; detail: string } {
	const text = description.trim()

	if (text.startsWith('```')) return { summary: text, detail: '' }

	const [summary = '', ...rest] = text.split(/\n\s*\n/)

	return { summary: summary.trim(), detail: rest.join('\n\n').trim() }
}

/**
 * Renders an API-reference description as block Markdown. It first resolves the
 * `{@link}` tokens that the extractor leaves in the text. A symbol reference
 * collapses to its bare name (no chip, no hover card); an external URL becomes
 * a Markdown link. Resolving up front keeps the
 * whole description on one block-Markdown pass, so its paragraphs, lists, and
 * fenced code survive. A per-link inline pass would flatten that block markup.
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
