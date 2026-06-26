'use client'

import { Link } from '../../../../components/link'
import { Markdown } from '../../../../components/markdown'
import type { LinkToken } from '../../api-reference/link-syntax'

/** An inline prose run, GFM-parsed so backtick code and emphasis render in flow. */
export function Prose({ text }: { text: string }) {
	return <Markdown inline>{text}</Markdown>
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
