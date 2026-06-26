'use client'

import type { ReactNode } from 'react'
import { Markdown } from '../../../../components/markdown'
import { LINK_RE, parseLinkToken } from '../../api-reference/link-syntax'
import { LinkText, Prose } from './doc-inline'

/**
 * Renders an API-reference description, resolving the `{@link}` tokens the
 * extractor leaves in the text. Link-free descriptions pass straight through
 * `<Markdown>` unchanged; when links are present, prose runs render as inline
 * Markdown and each reference collapses to its bare name — an external URL stays
 * a plain anchor, a symbol reference renders as the component name in flow with
 * no chip or hover card.
 */
export function DocDescription({
	description,
	className,
}: {
	description?: string
	className?: string
}) {
	if (!description) return null

	// Link-free descriptions keep their original block-Markdown rendering; only
	// those carrying a `{@link}` token take the segmented path.
	if (!new RegExp(LINK_RE.source).test(description))
		return <Markdown className={className}>{description}</Markdown>

	return (
		<div data-slot="doc-description" className={className}>
			{renderSegments(description)}
		</div>
	)
}

/** Split the description on `{@link}` tokens into alternating prose runs and bare references. */
function renderSegments(text: string): ReactNode[] {
	const nodes: ReactNode[] = []

	// A fresh regex avoids sharing the module-level `lastIndex` across renders.
	const re = new RegExp(LINK_RE.source, 'g')

	let last = 0

	let key = 0

	for (const match of text.matchAll(re)) {
		const index = match.index ?? 0

		if (index > last) {
			nodes.push(<Prose key={key++} text={text.slice(last, index)} />)
		}

		nodes.push(<LinkText key={key++} token={parseLinkToken(match[1] ?? '')} />)

		last = index + match[0].length
	}

	if (last < text.length) nodes.push(<Prose key={key++} text={text.slice(last)} />)

	return nodes
}
