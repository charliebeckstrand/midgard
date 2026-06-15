'use client'

import { Marked } from 'marked'
import { Link } from '../../../components/link'
import { cn } from '../../../core'
import { k } from '../../../recipes/kata/markdown'
import type { LinkToken } from '../../api-reference/link-syntax'

// Shared marked instance for the inline prose runs between `{@link}` references;
// mirrors the Markdown component's GFM config but parses inline so a fragment is
// not wrapped in its own block `<p>`.
const md = new Marked({ gfm: true })

/** An inline prose run, GFM-parsed so backtick code and emphasis render in flow. */
export function Prose({ text }: { text: string }) {
	return (
		<span
			className={cn(k.base)}
			// biome-ignore lint/security/noDangerouslySetInnerHtml: renders this library's trusted API descriptions; see the Markdown component's security note
			dangerouslySetInnerHTML={{ __html: md.parseInline(text, { async: false }) }}
		/>
	)
}

/**
 * A `{@link}` reference rendered as just its name: an external `url` stays a
 * plain anchor, every symbol reference collapses to its bare target (or
 * pipe-form label) as inline text — no chip, no hover card.
 */
export function LinkText({ token }: { token: LinkToken }) {
	const label = token.label ?? token.target

	if (token.url) {
		return (
			<Link color="blue" underline href={token.url} target="_blank" rel="noreferrer">
				{label}
			</Link>
		)
	}

	return <>{label}</>
}
