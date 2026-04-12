import { buildComponentFromInlineParams, buildComponentFromTypeName } from './build-component'
import { collectCvaVariants, cvaVariantsToTypeBody } from './cva'
import { extractBalancedBraces, extractBalancedParens, extractTypeRhs } from './scanner'
import type { ComponentApi, CvaVariant, ResolutionContext } from './types'

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

	// Annotate props whose types come from external packages
	if (ctx.externalImports.size > 0) {
		for (const api of found.values()) {
			for (const prop of api.props) {
				const pkg = ctx.externalImports.get(prop.type)

				if (pkg) prop.externalFrom = pkg
			}
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

	const fullSource = sources.join('\n')

	for (const source of sources) {
		const localVariants = collectCvaVariants(source, fullSource)

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

	const externalImports = collectExternalImports(fullSource)

	return { typeDefs, cvaVariants, externalImports }
}

// ---------------------------------------------------------------------------
// Context building
// ---------------------------------------------------------------------------

function mergeContext(source: string, shared?: ResolutionContext): ResolutionContext {
	const typeDefs = new Map<string, string>(shared?.typeDefs)

	const cvaVariants = new Map<string, CvaVariant[]>(shared?.cvaVariants)

	const localVariants = collectCvaVariants(source, source)

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

	// Merge external imports from shared context and local source
	const externalImports = new Map<string, string>(shared?.externalImports)

	for (const [name, pkg] of collectExternalImports(source)) {
		externalImports.set(name, pkg)
	}

	return { typeDefs, cvaVariants, externalImports }
}

/**
 * Collect type names imported from external (non-relative) packages.
 * Returns a map of type name → package name.
 */
function collectExternalImports(source: string): Map<string, string> {
	const result = new Map<string, string>()

	const importRegex = /import\s+\{([^}]+)\}\s+from\s+['"]([^'"]+)['"]/g

	for (let m = importRegex.exec(source); m !== null; m = importRegex.exec(source)) {
		const pkg = m[2]

		// Skip relative imports — those are internal
		if (!pkg || pkg.startsWith('.') || pkg.startsWith('/')) continue

		for (const specifier of m[1].split(',')) {
			const trimmed = specifier.trim().replace(/^type\s+/, '')

			const name = trimmed
				.split(/\s+as\s+/)
				.pop()
				?.trim()

			if (name && /^[A-Z]/.test(name)) {
				result.set(name, pkg)
			}
		}
	}

	return result
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
