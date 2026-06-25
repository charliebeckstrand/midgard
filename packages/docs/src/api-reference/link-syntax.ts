/**
 * Grammar for the TSDoc inline-link tokens carried in API-reference
 * descriptions. The build-time extractor normalizes every `{@link …}` it
 * resolves into this canonical form; the renderer parses it back out to
 * interleave reference chips with prose. Pure string handling, no `ts-morph`,
 * so it imports cleanly into both the engine and the client renderer.
 */

/** Matches one `{@link …}` token; the capture group is its raw inner text. */
export const LINK_RE = /\{@link\s+([^}]+?)\}/g

/** A parsed `{@link …}` token: a symbol reference, or an external `url`. */
export type LinkToken = {
	/** Symbol name or URL the link targets. */
	target: string
	/** Display text from the TSDoc `target | label` (or legacy `target label`) form. */
	label?: string
	/** Set when `target` is an external URL rather than a resolvable symbol. */
	url?: string
}

/** Split the inside of a `{@link …}` token into its target and optional label. */
export function parseLinkToken(inner: string): LinkToken {
	const trimmed = inner.trim()

	const pipe = trimmed.indexOf('|')

	let target: string
	let label: string | undefined

	if (pipe >= 0) {
		target = trimmed.slice(0, pipe).trim()
		label = trimmed.slice(pipe + 1).trim() || undefined
	} else {
		// Legacy JSDoc form: the display text follows the target after whitespace.
		const space = trimmed.search(/\s/)

		if (space >= 0) {
			target = trimmed.slice(0, space)
			label = trimmed.slice(space + 1).trim() || undefined
		} else {
			target = trimmed
		}
	}

	return /^[a-z][a-z0-9+.-]*:\/\//i.test(target)
		? { target, label, url: target }
		: { target, label }
}

/** Flatten any `{@link …}` tokens to their label or target, dropping the syntax. */
export function stripLinks(text: string): string {
	return text.replace(LINK_RE, (_match, inner: string) => {
		const { target, label } = parseLinkToken(inner)

		return label ?? target
	})
}
