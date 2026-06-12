import { ts } from 'ts-morph'
import type { PropDef } from '../types'
import { extractReferences } from './extract-references'
import { formatPropType } from './format-type'

const IGNORED_PROPS = new Set(['className', 'children', 'ref', 'key'])

type CollectedProp = { name: string; symbol: ts.Symbol; types: ts.Type[]; optional: boolean }

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

	for (const collected of collectAllProperties(propsType, callable, checker)) {
		const { name, symbol } = collected

		if (IGNORED_PROPS.has(name) || name.startsWith('_')) continue

		if (projectNames) {
			if (!projectNames.has(name)) continue
		} else if (!hasProjectDeclaration(symbol)) {
			continue
		}

		props.push(buildPropDef(collected, callable, defaults, checker))
	}

	return props
}

/**
 * Collects props from every union and intersection arm individually. Walking
 * arms separately surfaces arm-only discriminated members and collects every
 * contributing type for props that appear in multiple arms with distinct types.
 * Recursion splits nested unions within intersection arms.
 *
 * Optionality: a union type's own `getProperties()` returns only the props
 * common to every arm, so any prop *first* discovered inside an arm
 * (`partial`) is absent elsewhere and therefore optional; common props carry
 * the checker's merged `Optional` flag.
 */
function collectAllProperties(
	type: ts.Type,
	callable: ts.Node,
	checker: ts.TypeChecker,
): CollectedProp[] {
	const seen = new Map<string, { symbol: ts.Symbol; types: ts.Type[]; optional: boolean }>()

	const visit = (t: ts.Type, partial: boolean): void => {
		for (const sym of t.getProperties()) {
			const name = sym.getName()

			const armType = checker.getTypeOfSymbolAtLocation(sym, callable)

			const optional = !!(sym.flags & ts.SymbolFlags.Optional)

			const existing = seen.get(name)

			if (!existing) {
				seen.set(name, { symbol: sym, types: [armType], optional: partial || optional })
			} else {
				if (!existing.types.includes(armType)) existing.types.push(armType)

				existing.optional ||= optional
			}
		}

		if (t.flags & ts.TypeFlags.Union) {
			for (const arm of (t as ts.UnionType).types) visit(arm, true)

			return
		}

		if (t.flags & ts.TypeFlags.Intersection) {
			for (const arm of (t as ts.IntersectionType).types) visit(arm, partial)
		}
	}

	visit(type, false)

	return [...seen.entries()].map(([name, entry]) => ({ name, ...entry }))
}

function buildPropDef(
	collected: CollectedProp,
	callable: ts.Node,
	defaults: ReadonlyMap<string, string>,
	checker: ts.TypeChecker,
): PropDef {
	const { name, symbol, types: propTypes, optional } = collected

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

	const description = ts.displayPartsToString(symbol.getDocumentationComment(checker)).trim()

	if (description) prop.description = description

	if (!optional) prop.required = true

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
 * Returns the source text for mapped-type prop declarations instead of the
 * formatter's expansion (`{ [K in keyof T]?: Validator<T, K> | undefined }`).
 * Type references and primitives still flow through the formatter for alias
 * resolution.
 */
function inlineSourceType(symbol: ts.Symbol): string | null {
	const decl = symbol.getDeclarations()?.[0]

	if (!decl || !ts.isPropertySignature(decl) || !decl.type) return null

	const node = decl.type

	if (ts.isMappedTypeNode(node)) return node.getText()

	return null
}

/**
 * Returns true when the symbol has at least one declaration in project source.
 * Symbols declared only in `node_modules` (HTML attrs, React typings, library
 * mapped types) are pass-through, not authored props.
 */
function hasProjectDeclaration(symbol: ts.Symbol): boolean {
	const declarations = symbol.getDeclarations() ?? []

	if (declarations.length === 0) return false

	return declarations.some((decl) => !decl.getSourceFile().fileName.includes('/node_modules/'))
}

/** External npm package the symbol declares in; `undefined` for project source and the stdlib. */
function getExternalPackage(symbol: ts.Symbol): string | undefined {
	const decl = symbol.getDeclarations()?.[0]

	if (!decl) return undefined

	const file = decl.getSourceFile().fileName

	const pkg = parsePackageName(file)

	if (!pkg) return undefined

	// TS lib + React typings are not "external" in the docs sense.
	if (pkg === 'typescript' || pkg === '@types/react' || pkg === '@types/react-dom') {
		return undefined
	}

	return pkg
}

/**
 * Extracts the package name from the segment after the last `/node_modules/`,
 * covering both plain layouts and pnpm's
 * `.pnpm/<pkg>@<ver>/node_modules/<pkg>/...` nesting.
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
