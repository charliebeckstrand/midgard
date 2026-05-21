import { ts } from 'ts-morph'
import type { PropDef } from '../types'
import { extractReferences } from './extract-references'
import { formatPropType } from './format-type'

const IGNORED_PROPS = new Set(['className', 'children', 'ref', 'key'])

type CollectedProp = { name: string; symbol: ts.Symbol; types: ts.Type[] }

/**
 * Resolve every project-authored prop the component accepts. `projectNames`
 * is the authoritative filter when an annotation is available; without one,
 * fall back to a per-symbol declaration-source heuristic.
 */
export function extractProps(
	callable: ts.SignatureDeclaration,
	propsType: ts.Type,
	projectNames: ReadonlySet<string> | null,
	defaults: ReadonlyMap<string, string>,
	checker: ts.TypeChecker,
): PropDef[] {
	const props: PropDef[] = []

	for (const { name, symbol, types } of collectAllProperties(propsType, callable, checker)) {
		if (IGNORED_PROPS.has(name) || name.startsWith('_')) continue

		if (projectNames) {
			if (!projectNames.has(name)) continue
		} else if (!hasProjectDeclaration(symbol)) {
			continue
		}

		props.push(buildPropDef(name, symbol, types, callable, defaults, checker))
	}

	return props
}

/**
 * `propsType.getProperties()` on a union returns only the intersection of arm
 * properties, dropping discriminated members. Walk arms separately so each
 * arm-only prop surfaces with its own symbol, and so a prop that appears in
 * multiple arms with distinct types collects every contributing arm-type.
 *
 * Intersections are already merged by `getProperties()`, but their arms may
 * themselves contain unions — recurse to split nested unions too.
 */
function collectAllProperties(
	type: ts.Type,
	callable: ts.Node,
	checker: ts.TypeChecker,
): CollectedProp[] {
	const seen = new Map<string, { symbol: ts.Symbol; types: ts.Type[] }>()

	const visit = (t: ts.Type): void => {
		for (const sym of t.getProperties()) {
			const name = sym.getName()
			const armType = checker.getTypeOfSymbolAtLocation(sym, callable)
			const existing = seen.get(name)

			if (!existing) {
				seen.set(name, { symbol: sym, types: [armType] })
			} else if (!existing.types.includes(armType)) {
				existing.types.push(armType)
			}
		}

		if (t.flags & ts.TypeFlags.Union) {
			for (const arm of (t as ts.UnionType).types) visit(arm)

			return
		}

		if (t.flags & ts.TypeFlags.Intersection) {
			for (const arm of (t as ts.IntersectionType).types) visit(arm)
		}
	}

	visit(type)

	return [...seen.entries()].map(([name, { symbol, types }]) => ({ name, symbol, types }))
}

function buildPropDef(
	name: string,
	symbol: ts.Symbol,
	propTypes: ts.Type[],
	callable: ts.Node,
	defaults: ReadonlyMap<string, string>,
	checker: ts.TypeChecker,
): PropDef {
	const inline = inlineSourceType(symbol)

	const prop: PropDef = {
		name,
		type: inline ?? formatPropTypes(propTypes, callable, checker),
	}

	const references = extractReferences(prop.type, callable, checker)

	if (references) prop.references = references

	const externalFrom = getExternalPackage(symbol)

	if (externalFrom) prop.externalFrom = externalFrom

	const defaultVal = defaults.get(name)

	if (defaultVal !== undefined) prop.default = defaultVal

	return prop
}

/** Render each arm-type, dedupe by output text, and join distinct renderings with `|`. */
function formatPropTypes(types: ts.Type[], location: ts.Node, checker: ts.TypeChecker): string {
	const rendered: string[] = []

	for (const t of types) {
		const text = formatPropType(t, checker, location)

		if (!rendered.includes(text)) rendered.push(text)
	}

	return rendered.join(' | ')
}

/**
 * Targeted override: when the prop's declaration is a mapped type, return
 * its source text instead of letting the formatter expand it into noise
 * like `{ [K in keyof T]?: Validator<T, K> | undefined }`. Type references
 * and primitives still flow through the formatter for alias resolution.
 */
function inlineSourceType(symbol: ts.Symbol): string | null {
	const decl = symbol.getDeclarations()?.[0]

	if (!decl || !ts.isPropertySignature(decl) || !decl.type) return null

	const node = decl.type

	if (ts.isMappedTypeNode(node)) return node.getText()

	return null
}

/**
 * A "real" prop has at least one declaration in project source — symbols
 * declared only in `node_modules` (HTML attrs, React typings, library mapped
 * types) are pass-through, not authored props.
 *
 * `VariantProps<typeof recipe>` keys are the exception: they declare inside
 * `tailwind-variants` but the recipe's value lands back in project source,
 * so `getDeclarations()` includes the project site through the symbol's
 * intersection origin and they qualify here.
 */
function hasProjectDeclaration(symbol: ts.Symbol): boolean {
	const declarations = symbol.getDeclarations() ?? []

	if (declarations.length === 0) return false

	return declarations.some((decl) => !decl.getSourceFile().fileName.includes('/node_modules/'))
}

/** External npm package the symbol declares in — `undefined` for project source and the stdlib. */
function getExternalPackage(symbol: ts.Symbol): string | undefined {
	const decl = symbol.getDeclarations()?.[0]

	if (!decl) return undefined

	const file = decl.getSourceFile().fileName
	const pkg = parsePackageName(file)

	if (!pkg) return undefined

	// TS lib + React typings are background context, not "external" in the docs sense.
	if (pkg === 'typescript' || pkg === '@types/react' || pkg === '@types/react-dom') {
		return undefined
	}

	return pkg
}

/**
 * Take the segment after the last `/node_modules/`, which covers plain
 * layouts and pnpm's `.pnpm/<pkg>@<ver>/node_modules/<pkg>/...` nesting.
 */
function parsePackageName(file: string): string | null {
	const idx = file.lastIndexOf('/node_modules/')

	if (idx < 0) return null

	const rest = file.slice(idx + '/node_modules/'.length)
	const segments = rest.split('/')
	const first = segments[0]

	if (!first) return null

	if (first.startsWith('@')) {
		const second = segments[1]

		return second ? `${first}/${second}` : null
	}

	return first
}
