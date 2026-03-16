export type PropDef = {
	name: string
	type: string
	default?: string
}

export type ComponentApi = {
	name: string
	props: PropDef[]
}

const IGNORED_PROPS = new Set(['className', 'children', 'ref', 'key'])

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function parseSource(source: string): ComponentApi[] {
	const results: ComponentApi[] = []
	const typeDefs = collectTypeDefinitions(source)
	const fnRegex = /export\s+function\s+(\w+)\s*(?:<[^>]*>)?\s*\(([^)]*)\)/g

	for (let match = fnRegex.exec(source); match !== null; match = fnRegex.exec(source)) {
		const name = match[1]
		const paramBlock = match[2].trim()

		if (!paramBlock) continue

		const props = extractProps(paramBlock, typeDefs)

		if (props.length > 0) {
			results.push({ name, props })
		}
	}

	return results
}

// ---------------------------------------------------------------------------
// Type definition collection
// ---------------------------------------------------------------------------

function collectTypeDefinitions(source: string): Map<string, string> {
	const defs = new Map<string, string>()

	const typeRegex = /type\s+(\w+)(?:<[^>]*>)?\s*=\s*(\{[^}]*\})/g
	const ifaceRegex = /interface\s+(\w+)(?:<[^>]*>)?(?:\s+extends\s+[^{]*)?\s*(\{[^}]*\})/g

	for (let m = typeRegex.exec(source); m !== null; m = typeRegex.exec(source)) {
		defs.set(m[1], m[2])
	}

	for (let m = ifaceRegex.exec(source); m !== null; m = ifaceRegex.exec(source)) {
		defs.set(m[1], m[2])
	}

	return defs
}

// ---------------------------------------------------------------------------
// Prop extraction
// ---------------------------------------------------------------------------

function extractProps(paramBlock: string, typeDefs: Map<string, string>): PropDef[] {
	const colonIdx = findTypeAnnotationStart(paramBlock)

	if (colonIdx === -1) return []

	const destructured = paramBlock.slice(0, colonIdx).trim()
	const typeAnnotation = paramBlock.slice(colonIdx + 1).trim()
	const defaults = extractDefaults(destructured)
	const typeBody = resolveTypeBody(typeAnnotation, typeDefs)

	if (!typeBody) return []

	return parseTypeBody(typeBody, defaults)
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

// ---------------------------------------------------------------------------
// Default value extraction
// ---------------------------------------------------------------------------

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

function resolveTypeBody(annotation: string, typeDefs: Map<string, string>): string | null {
	const trimmed = annotation.trim()

	const inlineBrace = extractInlineObjectType(trimmed)

	if (inlineBrace) return inlineBrace

	const nameMatch = trimmed.match(/^(\w+)(?:<[^>]*>)?/)

	if (nameMatch && typeDefs.has(nameMatch[1])) {
		return typeDefs.get(nameMatch[1]) ?? null
	}

	return null
}

function extractInlineObjectType(annotation: string): string | null {
	let start = -1

	for (let i = 0; i < annotation.length; i++) {
		if (annotation[i] === '{') {
			start = i
			break
		}
	}

	if (start === -1) return null

	let depth = 0

	for (let i = start; i < annotation.length; i++) {
		if (annotation[i] === '{') depth++
		else if (annotation[i] === '}') {
			depth--
			if (depth === 0) return annotation.slice(start, i + 1)
		}
	}

	return null
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

// ---------------------------------------------------------------------------
// String splitting utilities
// ---------------------------------------------------------------------------

function splitAtTopLevel(str: string, ...delimiters: string[]): string[] {
	const parts: string[] = []
	let depth = 0
	let current = ''
	let inString: string | null = null

	for (let i = 0; i < str.length; i++) {
		const ch = str[i]

		if (inString) {
			current += ch
			if (ch === inString && str[i - 1] !== '\\') inString = null
			continue
		}

		if (ch === "'" || ch === '"' || ch === '`') {
			inString = ch
			current += ch
			continue
		}

		if (ch === '{' || ch === '[' || ch === '(' || ch === '<') depth++
		else if (ch === '}' || ch === ']' || ch === ')' || ch === '>') depth--

		if (delimiters.includes(ch) && depth === 0) {
			if (current.trim()) parts.push(current.trim())
			current = ''
		} else {
			current += ch
		}
	}

	if (current.trim()) parts.push(current.trim())

	return parts
}
