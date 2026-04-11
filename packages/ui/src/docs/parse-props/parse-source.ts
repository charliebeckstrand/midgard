import { collectCvaVariants, cvaVariantsToTypeBody } from './cva'
import {
	extractBalancedBraces,
	extractBalancedParens,
	extractInlineObjectType,
	extractTypeRhs,
	splitAtTopLevel,
} from './scanner'
import type { ComponentApi, CvaVariant, PassThrough, PropDef, ResolutionContext } from './types'

const IGNORED_PROPS = new Set(['className', 'children', 'ref', 'key'])

/** Parse a single concatenated source blob into a list of component APIs. */
export function parseSource(source: string, shared?: ResolutionContext): ComponentApi[] {
	const ctx = mergeContext(source, shared)

	const found = new Map<string, ComponentApi>()

	// export function Name(params: Type) { ... }
	const fnHeaderRegex = /export\s+function\s+(\w+)\s*(?:<[^>]*>)?\s*\(/g

	for (let m = fnHeaderRegex.exec(source); m !== null; m = fnHeaderRegex.exec(source)) {
		const name = m[1]
		if (!name) continue

		const parenStart = m.index + m[0].length - 1
		const paramBlock = extractBalancedParens(source, parenStart)
		if (!paramBlock) continue

		const inner = paramBlock.slice(1, -1).trim()
		if (!inner) {
			// No params — still a valid component
			found.set(name, { name, props: [] })
			continue
		}

		const api = buildComponentFromInlineParams(name, inner, ctx)
		if (api) found.set(name, api)
		else found.set(name, { name, props: [] })
	}

	// export const Name = forwardRef<Ref, Props>(...)
	const forwardRefRegex =
		/export\s+const\s+(\w+)(?:\s*:\s*[^=]+)?\s*=\s*(?:React\.)?forwardRef\s*<[^,>]+,\s*([\w.]+)(?:\s*<[^>]*>)?\s*>/g

	for (let m = forwardRefRegex.exec(source); m !== null; m = forwardRefRegex.exec(source)) {
		const name = m[1]
		const propsType = m[2]
		if (!name || !propsType) continue

		const api = buildComponentFromTypeName(name, propsType, ctx)
		found.set(name, api)
	}

	// export const Name = memo(function Name({ ... }: Props) { ... })
	const memoRegex =
		/export\s+const\s+(\w+)(?:\s*:\s*[^=]+)?\s*=\s*(?:React\.)?memo\s*\(\s*function\s+\w*\s*\(/g

	for (let m = memoRegex.exec(source); m !== null; m = memoRegex.exec(source)) {
		const name = m[1]
		if (!name) continue

		const parenStart = m.index + m[0].length - 1
		const paramBlock = extractBalancedParens(source, parenStart)
		if (!paramBlock) continue

		const inner = paramBlock.slice(1, -1).trim()
		if (!inner) {
			found.set(name, { name, props: [] })
			continue
		}

		const api = buildComponentFromInlineParams(name, inner, ctx)
		if (api) found.set(name, api)
		else found.set(name, { name, props: [] })
	}

	// Fallback: export const Name = someFactory(...) where `${Name}Props` is defined.
	// Picks up helper-created components like `export const NavbarItem = createNavItem(...)`.
	const factoryRegex = /export\s+const\s+([A-Z]\w*)\s*(?::\s*[^=]+)?\s*=\s*\w/g

	for (let m = factoryRegex.exec(source); m !== null; m = factoryRegex.exec(source)) {
		const name = m[1]
		if (!name || found.has(name)) continue

		const propsTypeName = `${name}Props`
		if (ctx.typeDefs.has(propsTypeName)) {
			found.set(name, buildComponentFromTypeName(name, propsTypeName, ctx))
		}
	}

	return Array.from(found.values())
}

/**
 * Build the shared resolution context used across the entire package so that
 * cross-module type references (e.g. `PolymorphicProps` defined in primitives)
 * can be resolved when parsing any component.
 */
export function buildResolutionContext(sources: string[]): ResolutionContext {
	const typeDefs = new Map<string, string>()
	const cvaVariants = new Map<string, CvaVariant[]>()

	for (const source of sources) {
		const localVariants = collectCvaVariants(source)
		for (const [k, v] of localVariants) cvaVariants.set(k, v)

		collectTypeDefinitionsInto(source, typeDefs)
	}

	// Resolve VariantProps<typeof X> references after all defs are loaded
	for (const [name, rhs] of typeDefs) {
		const vpMatch = rhs.match(/VariantProps<typeof\s+(\w+)>/)
		if (vpMatch) {
			const variants = cvaVariants.get(vpMatch[1])
			if (variants) {
				typeDefs.set(name, rhs.replace(vpMatch[0], cvaVariantsToTypeBody(variants)))
			}
		}
	}

	return { typeDefs, cvaVariants }
}

// ---------------------------------------------------------------------------
// Component building
// ---------------------------------------------------------------------------

function buildComponentFromInlineParams(
	name: string,
	paramBlock: string,
	ctx: ResolutionContext,
): ComponentApi | null {
	const colonIdx = findTypeAnnotationStart(paramBlock)
	if (colonIdx === -1) return null

	const destructured = paramBlock.slice(0, colonIdx).trim()
	const typeAnnotation = paramBlock.slice(colonIdx + 1).trim()
	const defaults = extractDefaults(destructured)

	return buildComponent(name, typeAnnotation, defaults, ctx)
}

function buildComponentFromTypeName(
	name: string,
	typeName: string,
	ctx: ResolutionContext,
): ComponentApi {
	return buildComponent(name, typeName, new Map(), ctx)
}

function buildComponent(
	name: string,
	annotation: string,
	defaults: Map<string, string>,
	ctx: ResolutionContext,
): ComponentApi {
	const { bodies, passThrough } = resolveTypeBodies(annotation, ctx)

	const props: PropDef[] = []
	const seen = new Set<string>()

	for (const body of bodies) {
		for (const prop of parseTypeBody(body, defaults, ctx)) {
			if (seen.has(prop.name)) continue
			seen.add(prop.name)
			props.push(prop)
		}
	}

	const api: ComponentApi = { name, props }
	if (passThrough.length > 0) api.passThrough = passThrough
	return api
}

// ---------------------------------------------------------------------------
// Type definition collection
// ---------------------------------------------------------------------------

function mergeContext(source: string, shared?: ResolutionContext): ResolutionContext {
	const typeDefs = new Map<string, string>(shared?.typeDefs)
	const cvaVariants = new Map<string, CvaVariant[]>(shared?.cvaVariants)

	const localVariants = collectCvaVariants(source)
	for (const [k, v] of localVariants) cvaVariants.set(k, v)

	collectTypeDefinitionsInto(source, typeDefs)

	// Resolve VariantProps<typeof X> references
	for (const [name, rhs] of typeDefs) {
		const vpMatch = rhs.match(/VariantProps<typeof\s+(\w+)>/)
		if (vpMatch) {
			const variants = cvaVariants.get(vpMatch[1])
			if (variants) {
				typeDefs.set(name, rhs.replace(vpMatch[0], cvaVariantsToTypeBody(variants)))
			}
		}
	}

	return { typeDefs, cvaVariants }
}

function collectTypeDefinitionsInto(source: string, defs: Map<string, string>): void {
	const typeRegex = /(?:export\s+)?type\s+(\w+)(?:<[^>]*>)?\s*=\s*/g

	for (let m = typeRegex.exec(source); m !== null; m = typeRegex.exec(source)) {
		const name = m[1]
		if (!name) continue

		const rhsStart = m.index + m[0].length
		const rhs = extractTypeRhs(source, rhsStart)
		if (rhs) defs.set(name, rhs)
	}

	const ifaceRegex = /(?:export\s+)?interface\s+(\w+)(?:<[^>]*>)?(?:\s+extends\s+[^{]*)?\s*(\{)/g

	for (let m = ifaceRegex.exec(source); m !== null; m = ifaceRegex.exec(source)) {
		const name = m[1]
		if (!name) continue

		const braceStart = m.index + m[0].length - 1
		const body = extractBalancedBraces(source, braceStart)
		if (body) defs.set(name, body)
	}
}

// ---------------------------------------------------------------------------
// Prop extraction helpers
// ---------------------------------------------------------------------------

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
// Type resolution (with pass-through detection)
// ---------------------------------------------------------------------------

type ResolvedType = {
	bodies: string[]
	passThrough: PassThrough[]
}

function resolveTypeBodies(
	annotation: string,
	ctx: ResolutionContext,
	visited: Set<string> = new Set(),
): ResolvedType {
	const bodies: string[] = []
	const passThrough: PassThrough[] = []

	const trimmed = annotation.trim()
	if (!trimmed) return { bodies, passThrough }

	// Split on top-level `|` for union types — keep each branch
	const unionParts = splitAtTopLevel(trimmed, '|')
	if (unionParts.length > 1) {
		for (const part of unionParts) {
			const resolved = resolveTypeBodies(part, ctx, visited)
			bodies.push(...resolved.bodies)
			passThrough.push(...resolved.passThrough)
		}
		return { bodies, passThrough: dedupePassThrough(passThrough) }
	}

	// Split on top-level `&` for intersection types
	const parts = splitAtTopLevel(trimmed, '&')

	for (const part of parts) {
		const p = part.trim()
		if (!p) continue

		// Parenthesized group — unwrap and recurse
		if (p.startsWith('(') && p.endsWith(')')) {
			const inner = p.slice(1, -1)
			const resolved = resolveTypeBodies(inner, ctx, visited)
			bodies.push(...resolved.bodies)
			passThrough.push(...resolved.passThrough)
			continue
		}

		// Inline object type `{ ... }`
		const inlineBrace = extractInlineObjectType(p)
		if (inlineBrace && inlineBrace.trim() === p) {
			bodies.push(inlineBrace)
			continue
		}

		// Pass-through: React.ComponentPropsWithoutRef<'element'> (optionally wrapped in Omit/Pick)
		const pt = detectPassThrough(p)
		if (pt) {
			passThrough.push(pt)
			continue
		}

		// Omit<Ref, keys> — resolve Ref, then filter the omitted keys from its body
		const omitMatch = p.match(/^Omit\s*<\s*([\s\S]+?)\s*,\s*([\s\S]+)\s*>$/)
		if (omitMatch) {
			const [, innerType, rawKeys] = omitMatch
			const omittedKeys = parseStringKeys(rawKeys)
			const resolved = resolveTypeBodies(innerType, ctx, visited)
			for (const body of resolved.bodies) {
				bodies.push(filterBodyKeys(body, omittedKeys))
			}
			for (const rpt of resolved.passThrough) {
				passThrough.push({
					element: rpt.element,
					omitted: Array.from(new Set([...(rpt.omitted ?? []), ...omittedKeys])),
				})
			}
			continue
		}

		// Pick<Ref, keys> — resolve Ref and keep only the given keys
		const pickMatch = p.match(/^Pick\s*<\s*([\s\S]+?)\s*,\s*([\s\S]+)\s*>$/)
		if (pickMatch) {
			const [, innerType, rawKeys] = pickMatch
			const keptKeys = new Set(parseStringKeys(rawKeys))
			const resolved = resolveTypeBodies(innerType, ctx, visited)
			for (const body of resolved.bodies) {
				bodies.push(keepBodyKeys(body, keptKeys))
			}
			continue
		}

		// Named type reference — resolve recursively
		const nameMatch = p.match(/^(\w+)(?:<[^>]*>)?$/)
		if (nameMatch) {
			const refName = nameMatch[1]
			if (!refName || visited.has(refName)) continue

			const typeDef = ctx.typeDefs.get(refName)
			if (typeDef) {
				const nextVisited = new Set(visited)
				nextVisited.add(refName)
				const resolved = resolveTypeBodies(typeDef, ctx, nextVisited)
				bodies.push(...resolved.bodies)
				passThrough.push(...resolved.passThrough)
				continue
			}

			// Direct VariantProps<typeof X>
			const vpInline = p.match(/^VariantProps<typeof\s+(\w+)>$/)
			if (vpInline) {
				const variants = ctx.cvaVariants.get(vpInline[1])
				if (variants) bodies.push(cvaVariantsToTypeBody(variants))
			}
		}
	}

	return { bodies, passThrough: dedupePassThrough(passThrough) }
}

function detectPassThrough(part: string): PassThrough | null {
	// React.ComponentPropsWithoutRef<'span'> or ComponentPropsWithoutRef<'button'>
	const cpr = part.match(
		/^(?:React\.)?Component(?:Props(?:WithoutRef|WithRef)?|PropsWithRef|PropsWithoutRef)\s*<\s*['"](\w+)['"]\s*>$/,
	)
	if (cpr) return { element: cpr[1] ?? '' }

	// React.HTMLAttributes<HTMLButtonElement> / React.ButtonHTMLAttributes<HTMLButtonElement>
	const htmlAttrs = part.match(/^(?:React\.)?\w*HTMLAttributes\s*<\s*HTML(\w+)Element\s*>$/)
	if (htmlAttrs) {
		const tag = (htmlAttrs[1] ?? '').toLowerCase() || 'element'
		return { element: tag }
	}

	// Package-wide helper: PolymorphicProps<'button'> resolves to an HTML element pass-through.
	// Defined in primitives/polymorphic.tsx — detected here by name so it works without
	// needing full TypeScript generic resolution.
	const poly = part.match(/^PolymorphicProps\s*<\s*['"](\w+)['"]\s*>$/)
	if (poly) return { element: poly[1] ?? '' }

	return null
}

function parseStringKeys(raw: string): string[] {
	return splitAtTopLevel(raw, '|')
		.map((s) => s.trim().replace(/^['"`]|['"`]$/g, ''))
		.filter(Boolean)
}

function filterBodyKeys(body: string, omittedKeys: string[]): string {
	if (omittedKeys.length === 0) return body
	const omit = new Set(omittedKeys)

	const inner = body.slice(1, -1)
	const kept: string[] = []
	for (const entry of splitAtTopLevel(inner, ';', '\n')) {
		const match = entry.trim().match(/^['"`]?([\w-]+)['"`]?\s*\??:/)
		if (match && omit.has(match[1] ?? '')) continue
		kept.push(entry.trim())
	}
	return `{ ${kept.join('; ')} }`
}

function keepBodyKeys(body: string, keptKeys: Set<string>): string {
	const inner = body.slice(1, -1)
	const kept: string[] = []
	for (const entry of splitAtTopLevel(inner, ';', '\n')) {
		const match = entry.trim().match(/^['"`]?([\w-]+)['"`]?\s*\??:/)
		if (!match || !keptKeys.has(match[1] ?? '')) continue
		kept.push(entry.trim())
	}
	return `{ ${kept.join('; ')} }`
}

function dedupePassThrough(items: PassThrough[]): PassThrough[] {
	const out: PassThrough[] = []
	const seen = new Set<string>()
	for (const item of items) {
		if (seen.has(item.element)) continue
		seen.add(item.element)
		out.push(item)
	}
	return out
}

// ---------------------------------------------------------------------------
// Type body parsing
// ---------------------------------------------------------------------------

function parseTypeBody(
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
