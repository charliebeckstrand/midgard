'use client'

import { Marked } from 'marked'
import { Fragment, type ReactNode } from 'react'
import { Link } from '../../../components/link'
import { Markdown } from '../../../components/markdown'
import { cn } from '../../../core'
import { k } from '../../../recipes/kata/markdown'
import { LINK_RE, type LinkToken, parseLinkToken } from '../../api-reference/link-syntax'

// Local marked instance for the inline prose runs between link references; mirrors
// the Markdown component's GFM config but parses inline so a fragment is not
// wrapped in its own block `<p>`.
const md = new Marked({ gfm: true })

/**
 * Renders an API-reference description, resolving the `{@link}` tokens the
 * extractor leaves in the text. Link-free descriptions pass straight through
 * `<Markdown>` unchanged; when links are present, prose runs render as inline
 * Markdown and each reference collapses to its bare name — an external URL stays
 * a plain anchor, a symbol reference renders as the component name in flow with
 * no chip or hover card.
 */
export function DocDescription({ description }: { description?: string }) {
	if (!description) return null

	// Link-free descriptions keep their original block-Markdown rendering; only
	// those carrying a `{@link}` token take the segmented path. Keyed on the
	// token so URL and symbol references parse out of the raw syntax instead of
	// leaking through.
	if (!new RegExp(LINK_RE.source).test(description)) return <Markdown>{description}</Markdown>

	return <div data-slot="doc-description">{renderSegments(description)}</div>
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

		nodes.push(renderLink(parseLinkToken(match[1] ?? ''), key++))

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

/**
 * A single `{@link}` reference rendered as just its name: an external `url` stays
 * a plain anchor, every symbol reference collapses to its bare target (or
 * pipe-form label) as inline text — no chip, no hover card.
 */
function renderLink(token: LinkToken, key: number): ReactNode {
	const label = token.label ?? token.target

	if (token.url) {
		return (
			<Link key={key} color="blue" underline href={token.url} target="_blank" rel="noreferrer">
				{label}
			</Link>
		)
	}

	return <Fragment key={key}>{label}</Fragment>
}
