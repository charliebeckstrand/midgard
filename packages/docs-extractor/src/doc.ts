import type ts from 'typescript'
import type { DocLink } from './schema'

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

type ExtractedDoc = { description?: string; links?: Record<string, DocLink> }

/**
 * Resolves a `{@link}` target name to its hover detail, or `null` when the name
 * is unknown. Backed by a package-wide export index rather than lexical scope:
 * TSDoc links resolve across files without an import, so `CommandPaletteItem`
 * referenced from a sibling file's comment still resolves even though the
 * comment's file never imports it.
 */
export type LinkResolver = (name: string) => DocLink | null

/**
 * Build a description plus a resolved `{@link}` map from a symbol's
 * documentation display parts. `displayPartsToString` concatenates the link
 * parts with no separator (`KbdProps` + `the kbd props` → `KbdPropsthe kbd
 * props`), so the parts are re-serialized here into canonical `{@link target}` /
 * `{@link target|label}` tokens before resolution.
 */
export function extractDocFromParts(
	parts: readonly ts.SymbolDisplayPart[],
	resolve: LinkResolver,
): ExtractedDoc {
	return processDoc(partsToText(parts), resolve)
}

/** Re-serialize documentation display parts, rebuilding the `{@link}` tokens `displayPartsToString` collapses. */
function partsToText(parts: readonly ts.SymbolDisplayPart[]): string {
	let out = ''

	let pendingName: string | null = null

	const flush = () => {
		if (pendingName !== null) {
			out += `{@link ${pendingName}}`

			pendingName = null
		}
	}

	for (const part of parts) {
		if (part.kind === 'linkName') {
			flush()

			pendingName = part.text.trim()
		} else if (part.kind === 'linkText') {
			// A `linkText` after a `linkName` is the display label; on its own it is
			// an unresolved bare link — a cross-file symbol name or a URL.
			if (pendingName !== null) {
				out += `{@link ${pendingName}|${part.text.trim()}}`

				pendingName = null
			} else {
				out += `{@link ${part.text.trim()}}`
			}
		} else if (part.kind !== 'link') {
			// `link` parts are the `{@link `/`}` delimiters; everything else is prose.
			flush()

			out += part.text
		}
	}

	flush()

	return out
}

/** Normalize `{@link}` tokens to canonical form and resolve each symbol target to its hover detail. */
function processDoc(text: string, resolve: LinkResolver): ExtractedDoc {
	const trimmed = text.trim()

	if (!trimmed) return {}

	const links: Record<string, DocLink> = {}

	const description = trimmed.replace(LINK_RE, (_match, inner: string) => {
		const { target, label, url } = parseLinkToken(inner)

		if (!url && !(target in links)) {
			const resolved = resolve(target)

			if (resolved) links[target] = resolved
		}

		return label ? `{@link ${target}|${label}}` : `{@link ${target}}`
	})

	const doc: ExtractedDoc = { description }

	if (Object.keys(links).length > 0) doc.links = links

	return doc
}
