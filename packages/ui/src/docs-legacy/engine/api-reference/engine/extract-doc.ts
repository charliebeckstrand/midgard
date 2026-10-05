import type { ts } from 'ts-morph'
import { LINK_RE, parseLinkToken } from '../link-syntax'

type ExtractedDoc = { description?: string }

/**
 * Build a description from a symbol's documentation display parts. `displayPartsToString` concatenates the link
 * parts with no separator (`KbdProps` + `the kbd props` → `KbdPropsthe kbd
 * props`), so the parts are re-serialized here into canonical `{@link target}` /
 * `{@link target|label}` tokens. Used for prop summaries.
 */
export function extractDocFromParts(parts: readonly ts.SymbolDisplayPart[]): ExtractedDoc {
	return processDoc(partsToText(parts))
}

/**
 * Build a description from raw comment text. Component summaries arrive as
 * already-lossless source text (ts-morph's `getDescription()` preserves
 * `{@link}` verbatim), so they skip the part re-serialization.
 */
export function extractDocFromText(text: string): ExtractedDoc {
	return processDoc(text)
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

/**
 * Normalize `{@link}` tokens to canonical form. The renderer shows a symbol
 * reference as plain text, so the extractor resolves no target. The output
 * depends on this comment alone, never on the file that declares a target.
 */
function processDoc(text: string): ExtractedDoc {
	const trimmed = text.trim()

	if (!trimmed) return {}

	const description = trimmed.replace(LINK_RE, (_match, inner: string) => {
		const { target, label } = parseLinkToken(inner)

		return label ? `{@link ${target}|${label}}` : `{@link ${target}}`
	})

	return { description }
}
