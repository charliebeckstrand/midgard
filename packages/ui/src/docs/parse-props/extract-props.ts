import { splitAtTopLevel } from './scanner'

export const IGNORED_PROPS = new Set(['className', 'children', 'ref', 'key'])

export function findTypeAnnotationStart(paramBlock: string): number {
	let depth = 0

	for (let i = 0; i < paramBlock.length; i++) {
		const ch = paramBlock[i]

		if (ch === '{' || ch === '[' || ch === '(') depth++
		else if (ch === '}' || ch === ']' || ch === ')') depth--
		else if (ch === ':' && depth === 0) return i
	}

	return -1
}

/** Extract all named parameters from a destructured block (ignoring rest params). */
export function extractDestructuredNames(destructured: string): string[] {
	// Only works on destructured params ({ a, b, ... }), not plain identifiers
	if (!destructured.startsWith('{')) return []

	const inner = destructured.replace(/^\{|\}$/g, '').trim()

	if (!inner) return []

	const names: string[] = []

	for (const part of splitAtTopLevel(inner, ',')) {
		const trimmed = part.trim()

		if (!trimmed || trimmed.startsWith('...')) continue

		// Handle renaming (original: renamed) and defaults (name = value)
		const name = trimmed.split(/\s*[:=]\s*/)[0]?.trim()

		if (name) names.push(name)
	}

	return names
}

/** Infer a type string from a default value expression. */
export function inferTypeFromDefault(value: string | undefined): string {
	if (value === undefined) return 'unknown'
	if (value === 'true' || value === 'false') return 'boolean'
	if (value === 'undefined') return 'unknown'
	if (value === 'null') return 'unknown'

	if (/^['"`]/.test(value)) return 'string'
	if (/^-?\d/.test(value)) return 'number'

	if (value.startsWith('[')) return 'array'
	if (value.startsWith('{')) return 'object'

	return 'unknown'
}

export function extractDefaults(destructured: string): Map<string, string> {
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
