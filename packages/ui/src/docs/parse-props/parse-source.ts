import { collectCvaVariants, cvaVariantsToTypeBody } from './cva'
import {
	extractBalancedBraces,
	extractBalancedParens,
	extractInlineObjectType,
	extractTypeRhs,
	splitAtTopLevel,
} from './scanner'
import type { ComponentApi, CvaVariant, PropDef } from './types'

const IGNORED_PROPS = new Set(['className', 'children', 'ref', 'key'])

export function parseSource(source: string): ComponentApi[] {
	const results: ComponentApi[] = []
	const cvaVariants = collectCvaVariants(source)
	const typeDefs = collectTypeDefinitions(source, cvaVariants)

	const fnHeaderRegex = /export\s+function\s+(\w+)\s*(?:<[^>]*>)?\s*\(/g

	for (let m = fnHeaderRegex.exec(source); m !== null; m = fnHeaderRegex.exec(source)) {
		const name = m[1]
		const parenStart = m.index + m[0].length - 1
		const paramBlock = extractBalancedParens(source, parenStart)

		if (!paramBlock) continue

		const inner = paramBlock.slice(1, -1).trim()

		if (!inner) continue

		const props = extractProps(inner, typeDefs, cvaVariants)

		if (props.length > 0) {
			results.push({ name, props })
		}
	}

	return results
}

// ---------------------------------------------------------------------------
// Type definition collection
// ---------------------------------------------------------------------------

function collectTypeDefinitions(
	source: string,
	cvaVariants: Map<string, CvaVariant[]>,
): Map<string, string> {
	const defs = new Map<string, string>()

	const typeRegex = /type\s+(\w+)(?:<[^>]*>)?\s*=\s*/g

	for (let m = typeRegex.exec(source); m !== null; m = typeRegex.exec(source)) {
		const name = m[1]
		const rhsStart = m.index + m[0].length
		const rhs = extractTypeRhs(source, rhsStart)

		if (name && rhs) {
			defs.set(name, rhs)
		}
	}

	const ifaceRegex = /interface\s+(\w+)(?:<[^>]*>)?(?:\s+extends\s+[^{]*)?\s*(\{)/g

	for (let m = ifaceRegex.exec(source); m !== null; m = ifaceRegex.exec(source)) {
		const name = m[1]
		const braceStart = m.index + m[0].length - 1
		const body = extractBalancedBraces(source, braceStart)

		if (name && body) {
			defs.set(name, body)
		}
	}

	// Resolve VariantProps references to synthetic type bodies
	for (const [name, rhs] of defs) {
		const vpMatch = rhs.match(/VariantProps<typeof\s+(\w+)>/)

		if (vpMatch) {
			const variants = cvaVariants.get(vpMatch[1])

			if (variants) {
				defs.set(name, rhs.replace(vpMatch[0], cvaVariantsToTypeBody(variants)))
			}
		}
	}

	return defs
}

// ---------------------------------------------------------------------------
// Prop extraction
// ---------------------------------------------------------------------------

function extractProps(
	paramBlock: string,
	typeDefs: Map<string, string>,
	cvaVariants?: Map<string, CvaVariant[]>,
): PropDef[] {
	const colonIdx = findTypeAnnotationStart(paramBlock)

	if (colonIdx === -1) return []

	const destructured = paramBlock.slice(0, colonIdx).trim()
	const typeAnnotation = paramBlock.slice(colonIdx + 1).trim()
	const defaults = extractDefaults(destructured)
	const bodies = resolveTypeBodies(typeAnnotation, typeDefs, cvaVariants)

	if (bodies.length === 0) return []

	const props: PropDef[] = []

	for (const body of bodies) {
		props.push(...parseTypeBody(body, defaults))
	}

	return props
}

function findTypeAnnotationStart(paramBlock: string): number {
	let depth = 0

	for (let i = 0; i < paramBlock.length; i++) {
		const ch = paramBlock[i]

		if (ch === '{' || ch === '[' || ch === '(') depth++
		else if (ch === '}' || ch === ']' || ch === ')') depth--
		else if (ch === ':' && depth === 0) return i
	}

	return -1
}

function extractDefaults(destructured: string): Map<string, string> {
	const defaults = new Map<string, string>()
	const inner = destructured.replace(/^\{|\}$/g, '').trim()

	if (!inner) return defaults

	for (const part of splitAtTopLevel(inner, ',')) {
		const eqIdx = part.indexOf('=')

		if (eqIdx === -1) continue

		const raw = part.slice(0, eqIdx).trim()
		const name = raw.includes(':') ? (raw.split(':').pop()?.trim() ?? '') : raw
		const value = part.slice(eqIdx + 1).trim()

		if (name && !name.startsWith('...')) {
			defaults.set(name, value)
		}
	}

	return defaults
}

// ---------------------------------------------------------------------------
// Type resolution
// ---------------------------------------------------------------------------

function resolveTypeBodies(
	annotation: string,
	typeDefs: Map<string, string>,
	cvaVariants?: Map<string, CvaVariant[]>,
): string[] {
	const trimmed = annotation.trim()
	const bodies: string[] = []

	// Split on top-level `&` to handle intersection types
	const parts = splitAtTopLevel(trimmed, '&')

	for (const part of parts) {
		const p = part.trim()

		// Inline object type
		const inlineBrace = extractInlineObjectType(p)

		if (inlineBrace) {
			bodies.push(inlineBrace)
			continue
		}

		// Named type reference — resolve recursively
		const nameMatch = p.match(/^(\w+)(?:<[^>]*>)?/)

		if (nameMatch && typeDefs.has(nameMatch[1])) {
			// biome-ignore lint/style/noNonNullAssertion: guaranteed by has() check above
			const resolved = resolveTypeBodies(typeDefs.get(nameMatch[1])!, typeDefs, cvaVariants)
			bodies.push(...resolved)
			continue
		}

		// Direct VariantProps<typeof X> in annotation
		if (cvaVariants) {
			const vpMatch = p.match(/^VariantProps<typeof\s+(\w+)>/)

			if (vpMatch) {
				const variants = cvaVariants.get(vpMatch[1])

				if (variants) {
					bodies.push(cvaVariantsToTypeBody(variants))
				}
			}
		}
	}

	return bodies
}

// ---------------------------------------------------------------------------
// Type body parsing
// ---------------------------------------------------------------------------

function parseTypeBody(typeBody: string, defaults: Map<string, string>): PropDef[] {
	const props: PropDef[] = []
	const inner = typeBody.slice(1, -1).trim()

	if (!inner) return props

	for (const entry of splitAtTopLevel(inner, ';', '\n')) {
		const trimmed = entry.trim()

		if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('/*')) continue

		const propMatch = trimmed.match(/^['"]?([\w-]+)['"]?\s*\??:\s*(.+)$/)

		if (!propMatch) continue

		const [, name, type] = propMatch

		if (IGNORED_PROPS.has(name)) continue

		const cleanType = type.replace(/;?\s*$/, '').trim()
		const defaultVal = defaults.get(name)

		props.push({
			name,
			type: cleanType,
			...(defaultVal !== undefined ? { default: defaultVal } : {}),
		})
	}

	return props
}
