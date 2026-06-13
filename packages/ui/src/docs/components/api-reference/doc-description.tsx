'use client'

import { Marked } from 'marked'
import type { ReactNode } from 'react'
import { Badge } from '../../../components/badge'
import { Link } from '../../../components/link'
import { Markdown } from '../../../components/markdown'
import { Tooltip, TooltipContent, TooltipTrigger } from '../../../components/tooltip'
import { cn } from '../../../core'
import { k } from '../../../recipes/kata/markdown'
import { LINK_RE, type LinkToken, parseLinkToken } from '../../api-reference/link-syntax'
import type { DocLink } from '../../api-reference/types'

// Local marked instance for the inline prose runs between link chips; mirrors
// the Markdown component's GFM config but parses inline so a fragment is not
// wrapped in its own block `<p>`.
const md = new Marked({ gfm: true })

/**
 * Renders an API-reference description, resolving the `{@link}` tokens the
 * extractor leaves in the text. Link-free descriptions pass straight through
 * `<Markdown>` unchanged; when links are present, prose runs render as inline
 * Markdown and each reference becomes a rose chip whose hover card carries the
 * target's signature and summary (`card`, the default). Set `card={false}`
 * inside an existing tooltip (prop rows) to drop the nested hover card.
 */
export function DocDescription({
	description,
	links,
	card = true,
}: {
	description?: string
	links?: Record<string, DocLink>
	card?: boolean
}) {
	if (!description) return null

	// Link-free descriptions keep their original block-Markdown rendering; only
	// those carrying a `{@link}` token take the segmented path. Keyed on the
	// token, not `links`, so URL and unresolved references still parse out of the
	// raw syntax instead of leaking through.
	if (!new RegExp(LINK_RE.source).test(description)) return <Markdown>{description}</Markdown>

	return <div data-slot="doc-description">{renderSegments(description, links ?? {}, card)}</div>
}

/** Split the description on `{@link}` tokens into alternating prose runs and reference chips. */
function renderSegments(text: string, links: Record<string, DocLink>, card: boolean): ReactNode[] {
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

		const token = parseLinkToken(match[1] ?? '')

		nodes.push(<LinkBadge key={key++} token={token} link={links[token.target]} card={card} />)

		last = index + match[0].length
	}

	if (last < text.length) nodes.push(<Prose key={key++} text={text.slice(last)} />)

	return nodes
}

/** An inline prose run, GFM-parsed so backtick code and emphasis render in flow. */
function Prose({ text }: { text: string }) {
	return (
		<span
			className={cn(k.base)}
			// biome-ignore lint/security/noDangerouslySetInnerHtml: renders this library's trusted API descriptions; see the Markdown component's security note
			dangerouslySetInnerHTML={{ __html: md.parseInline(text, { async: false }) }}
		/>
	)
}

/** Props for {@link DocDescription}; the API description text, plus the resolved links for any `{@link}` tokens it contains. */
function LinkBadge({ token, link, card }: { token: LinkToken; link?: DocLink; card: boolean }) {
	const label = token.label ?? token.target

	if (token.url) {
		return (
			<Link color="blue" underline href={token.url} target="_blank" rel="noreferrer">
				{label}
			</Link>
		)
	}

	if (!link || !card) {
		return (
			<Badge variant="soft" title={link ? quickInfo(link) : undefined}>
				{label}
			</Badge>
		)
	}

	return (
		<Tooltip placement="top">
			<TooltipTrigger>
				<Badge variant="soft" data-has-info={!!(link.signature || link.summary) || undefined}>
					{label}
				</Badge>
			</TooltipTrigger>
			<TooltipContent>
				<div className="max-w-xs space-y-2">
					{link.signature && (
						<div className="font-mono text-sm text-zinc-700 dark:text-zinc-300">
							{link.signature}
						</div>
					)}
					{link.summary && <Markdown className="text-sm">{link.summary}</Markdown>}
				</div>
			</TooltipContent>
		</Tooltip>
	)
}

/** Plain-text quick info for the `title` fallback used inside an existing tooltip. */
function quickInfo(link: DocLink): string {
	return [link.signature, link.summary].filter(Boolean).join('\n\n')
}
