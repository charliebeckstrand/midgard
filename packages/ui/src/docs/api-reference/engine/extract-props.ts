import { ts } from 'ts-morph'
import type { PropDef } from '../types'
import { extractReferences } from './extract-references'
import { formatPropType } from './format-type'

const IGNORED_PROPS = new Set(['className', 'children', 'ref', 'key'])

type CollectedProp = { name: string; symbol: ts.Symbol; types: ts.Type[] }

/**
 * Resolve every prop the component accepts, filtered down to project-authored
 * ones. Returns a list of `PropDef` ready for the API reference table.
 *
 * The flow is:
 *
 *   1. Read each prop from the resolved props type, walking union arms so
 *      discriminated-union members surface with their own arm-bound types.
 *   2. Filter to project-authored names (caller passes in the authoritative
 *      set when the props parameter has a type annotation; otherwise we fall
 *      back to a per-symbol heuristic).
 *   3. Format each remaining prop's type to a display string and resolve any
 *      named references inside.
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
 * `propsType.getProperties()` on a union returns only the *intersection* of
 * arm properties, dropping discriminated-union members. Walk arms separately
 * so each arm-only prop surfaces with its own arm-bound symbol, and so that
 * when the same prop name shows up in multiple arms with distinct types,
 * every contributing arm-type is collected.
 *
 * Intersections are already merged by `getProperties()`, but their arms may
 * themselves contain unions — recurse so nested unions are still split.
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

/**
 * Format every contributing arm-type for a prop, dedupe by rendered text, and
 * join with `|` when more than one distinct rendering remains.
 */
function formatPropTypes(types: ts.Type[], location: ts.Node, checker: ts.TypeChecker): string {
	const rendered: string[] = []

	for (const t of types) {
		const text = formatPropType(t, checker, location)

		if (!rendered.includes(text)) rendered.push(text)
	}

	return rendered.join(' | ')
}

/**
 * Use the prop's source-text annotation when its declaration carries an
 * inline structural shape (mapped types, object literals) — TS otherwise
 * expands these into uglier forms like
 * `{ [K in keyof T]?: Validator<T, K> | undefined; }`. The bare TypeNode
 * source preserves what the user wrote.
 *
 * Only used as a targeted override; type references and primitives still
 * flow through the formatter so they pick up alias / generic resolution.
 */
function inlineSourceType(symbol: ts.Symbol): string | null {
	const decl = symbol.getDeclarations()?.[0]

	if (!decl || !ts.isPropertySignature(decl) || !decl.type) return null

	const node = decl.type

	if (ts.isMappedTypeNode(node)) return node.getText()

	return null
}

/**
 * A property qualifies as a "real" prop when it has at least one declaration
 * in project source — i.e. `node_modules` declarations alone (HTML attrs,
 * React typings, library mapped types) are pass-through, not authored props.
 *
 * Caveat: props derived from `VariantProps<typeof recipe>` declare in
 * tailwind-variants' source. Those are intentionally re-attributed via
 * `externalFrom` rather than skipped — `hasProjectDeclaration` returns true
 * for them only when the recipe's value flows back into a project-source
 * declaration site, which `getDeclarations()` includes via the symbol's
 * intersection origin.
 */
function hasProjectDeclaration(symbol: ts.Symbol): boolean {
	const declarations = symbol.getDeclarations() ?? []

	if (declarations.length === 0) return false

	return declarations.some((decl) => !decl.getSourceFile().fileName.includes('/node_modules/'))
}

/**
 * Determine which external npm package a symbol's declarations come from.
 * Returns `undefined` for project-local or standard-library symbols.
 */
function getExternalPackage(symbol: ts.Symbol): string | undefined {
	const decl = symbol.getDeclarations()?.[0]

	if (!decl) return undefined

	const file = decl.getSourceFile().fileName
	const pkg = parsePackageName(file)

	if (!pkg) return undefined

	// Skip TS lib + React typings (those are background, not "external" in the docs sense)
	if (pkg === 'typescript' || pkg === '@types/react' || pkg === '@types/react-dom') {
		return undefined
	}

	return pkg
}

/**
 * Pull the package name out of a node_modules path. Handles plain layouts
 * (`/node_modules/foo/...`, `/node_modules/@scope/foo/...`) and pnpm's nested
 * layout (`/node_modules/.pnpm/foo@x.y.z/node_modules/foo/...`) by always
 * preferring the segment after the last `/node_modules/`.
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
