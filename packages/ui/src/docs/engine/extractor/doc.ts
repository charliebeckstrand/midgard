import type ts from 'typescript'

// Re-exported for the sibling extractor modules that strip links from prose.
export { stripLinks } from '../link-syntax'

/**
 * Rebuild a description string from a symbol's documentation display parts,
 * restoring the `{@link}` tokens `displayPartsToString` collapses — it
 * concatenates the link parts with no separator (`KbdProps` + `the kbd props`
 * → `KbdPropsthe kbd props`). The renderer parses the canonical tokens back out
 * of the description; nothing resolves them to hover detail, so nothing is.
 */
export function extractDocFromParts(parts: readonly ts.SymbolDisplayPart[]): string {
	return partsToText(parts).trim()
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
