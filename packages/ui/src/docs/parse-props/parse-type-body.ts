import { cvaVariantsToTypeBody } from './cva'
import { IGNORED_PROPS } from './extract-props'
import { splitAtTopLevel } from './scanner'
import type { PropDef, ResolutionContext } from './types'

export function parseTypeBody(
	typeBody: string,
	defaults: Map<string, string>,
	ctx: ResolutionContext,
): PropDef[] {
	const props: PropDef[] = []

	const inner = typeBody.slice(1, -1).trim()

	if (!inner) return props

	for (const entry of splitAtTopLevel(inner, ';', '\n', ',')) {
		const trimmed = entry.trim()

		if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('/*')) continue

		const propMatch = trimmed.match(/^['"`]?([\w-]+)['"`]?\s*\??:\s*([\s\S]+)$/)

		if (!propMatch) continue

		const [, name, type] = propMatch

		if (!name || IGNORED_PROPS.has(name) || name.startsWith('_')) continue

		const cleanType = (type ?? '').replace(/;?\s*$/, '').trim()

		const breakdown = expandBreakdown(cleanType, ctx)

		const defaultVal = defaults.get(name)

		const prop: PropDef = { name, type: cleanType }

		if (breakdown && breakdown !== cleanType) prop.breakdown = breakdown

		if (defaultVal !== undefined) prop.default = defaultVal

		props.push(prop)
	}

	return props
}

/**
 * Expand a prop's type by substituting any named references with their
 * resolved definitions. Returns the fully expanded form if it differs from
 * the original, otherwise undefined. Inline object members are summarized
 * to their key list so the output stays readable.
 */
function expandBreakdown(
	type: string,
	ctx: ResolutionContext,
	visited: Set<string> = new Set(),
	depth = 0,
): string | undefined {
	if (depth > 3) return undefined

	const parts = splitUnionMembers(type)

	let changed = false

	const expanded: string[] = []

	for (const part of parts) {
		// Inline object literal — summarize to its key list
		if (part.startsWith('{') && part.endsWith('}')) {
			const summary = summarizeBody(part)

			if (summary) {
				expanded.push(summary)

				if (summary !== part) changed = true
			} else {
				expanded.push(part)
			}

			continue
		}

		const nameMatch = part.match(/^(\w+)(?:<[^>]*>)?$/)

		if (!nameMatch) {
			expanded.push(part)

			continue
		}

		const refName = nameMatch[1] ?? ''

		if (visited.has(refName)) {
			expanded.push(part)

			continue
		}

		// VariantProps<typeof X>
		const vpInline = part.match(/^VariantProps<typeof\s+(\w+)>$/)

		if (vpInline) {
			const variants = ctx.cvaVariants.get(vpInline[1])

			if (variants) {
				expanded.push(summarizeBody(cvaVariantsToTypeBody(variants)) ?? part)

				changed = true

				continue
			}
		}

		const typeDef = ctx.typeDefs.get(refName)

		if (!typeDef) {
			expanded.push(part)

			continue
		}

		const nextVisited = new Set(visited)

		nextVisited.add(refName)

		const defTrim = normalizeWhitespace(typeDef)

		// Object body — summarize as inline keys: "{ zone, index }"
		if (defTrim.startsWith('{') && defTrim.endsWith('}')) {
			const summary = summarizeBody(defTrim)

			if (summary) {
				expanded.push(summary)

				changed = true

				continue
			}
		}

		// Otherwise recurse into the definition (handles nested unions / refs)
		const inner = expandBreakdown(defTrim, ctx, nextVisited, depth + 1) ?? defTrim

		expanded.push(inner)

		if (inner !== part) changed = true
	}

	if (!changed) return undefined

	return expanded.join(' | ')
}

/** Split a union into top-level members, dropping a leading `|` and empty parts. */
function splitUnionMembers(type: string): string[] {
	const normalized = normalizeWhitespace(type).replace(/^\|\s*/, '')

	return splitAtTopLevel(normalized, '|')
		.map((p) => p.trim())
		.filter(Boolean)
}

/** Collapse whitespace to single spaces so multi-line type defs render cleanly. */
function normalizeWhitespace(s: string): string {
	return s.replace(/\s+/g, ' ').trim()
}

/** Summarize an object type body as its top-level union of key names (for display). */
function summarizeBody(body: string): string | undefined {
	const inner = body.slice(1, -1).trim()

	if (!inner) return undefined

	const keys: string[] = []

	for (const entry of splitAtTopLevel(inner, ';', '\n', ',')) {
		const match = entry.trim().match(/^['"`]?([\w-]+)['"`]?\s*\??:/)

		if (match?.[1]) keys.push(match[1])
	}

	if (keys.length === 0) return undefined

	return `{ ${keys.join(', ')} }`
}
