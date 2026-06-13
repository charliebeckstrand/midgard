import type { ts } from 'ts-morph'
import { LINK_RE, parseLinkToken } from '../link-syntax'
import type { DocLink } from '../types'

type ExtractedDoc = { description?: string; links?: Record<string, DocLink> }

/**
 * Resolves a `{@link}` target name to its hover detail, or `null` when the name
 * is unknown. Backed by a package-wide export index ({@link createLinkResolver})
 * rather than lexical scope: TSDoc links resolve across files without an import,
 * so `CommandPaletteItem` referenced from a sibling file's comment still
 * resolves even though the comment's file never imports it.
 */
export type LinkResolver = (name: string) => DocLink | null

/**
 * Build a description plus a resolved `{@link}` map from a symbol's
 * documentation display parts. `displayPartsToString` concatenates the link
 * parts with no separator (`KbdProps` + `the kbd props` → `KbdPropsthe kbd
 * props`), so the parts are re-serialized here into canonical `{@link target}` /
 * `{@link target|label}` tokens before resolution. Used for prop summaries.
 */
export function extractDocFromParts(
	parts: readonly ts.SymbolDisplayPart[],
	resolve: LinkResolver,
): ExtractedDoc {
	return processDoc(partsToText(parts), resolve)
}

/**
 * Build a description plus a resolved `{@link}` map from raw comment text.
 * Component summaries arrive as already-lossless source text (ts-morph's
 * `getDescription()` preserves `{@link}` verbatim), so they skip the part
 * re-serialization and go straight to resolution.
 */
export function extractDocFromText(text: string, resolve: LinkResolver): ExtractedDoc {
	return processDoc(text, resolve)
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
