import ts from 'typescript'
import { extractCvaDefaults } from './extract-cva-defaults'
import { extractDefaults } from './extract-defaults'
import { extractReferences } from './extract-references'
import type { ComponentDecl } from './find-components'
import { formatPropType } from './format-type'
import { detectPassThroughs } from './passthrough'
import { collectProjectPropNames } from './project-props'
import type { ComponentApi, PropDef } from './types'

const IGNORED_PROPS = new Set(['className', 'children', 'ref', 'key'])

/**
 * Build a `ComponentApi` for one component declaration. Resolves the props
 * parameter type via the type checker, lists each declared property, and
 * separately detects HTML pass-through.
 */
export function buildComponentApi(decl: ComponentDecl, checker: ts.TypeChecker): ComponentApi {
	const propsType = getPropsType(decl, checker)

	const passThrough = detectPassThroughs(decl, checker)

	const annotation = getPropsAnnotation(decl.callable)

	const projectNames = annotation ? collectProjectPropNames(annotation, checker) : null

	const props: PropDef[] = []

	if (propsType) {
		// Inline destructured defaults take priority over CVA `defaultVariants`
		// (the inline form is the value the component actually applies).
		const cvaDefaults = annotation ? extractCvaDefaults(annotation, checker) : new Map()

		const inlineDefaults = extractDefaults(decl.callable)

		const defaults = new Map([...cvaDefaults, ...inlineDefaults])

		for (const symbol of collectAllProperties(propsType)) {
			const name = symbol.getName()

			if (IGNORED_PROPS.has(name) || name.startsWith('_')) continue

			// `projectNames` is the authoritative set of "real" props derived
			// from the annotation. When unavailable (no annotation), fall back
			// to the declaration heuristic.
			if (projectNames) {
				if (!projectNames.has(name)) continue
			} else if (!hasProjectDeclaration(symbol)) {
				continue
			}

			props.push(buildPropDef(name, symbol, decl, checker, defaults))
		}
	}

	const api: ComponentApi = { name: decl.name, props }

	if (passThrough.length > 0) api.passThrough = passThrough

	return api
}

/** Get the props parameter's type annotation node, if any. */
function getPropsAnnotation(callable: ts.Node): ts.TypeNode | null {
	const fn = unwrapFunctionLike(callable)

	if (!fn) return null

	const param = fn.parameters[0]

	return param?.type ?? null
}

function unwrapFunctionLike(node: ts.Node): ts.SignatureDeclaration | null {
	if (ts.isFunctionDeclaration(node) || ts.isFunctionExpression(node) || ts.isArrowFunction(node)) {
		return node
	}

	if (ts.isCallExpression(node)) {
		for (const arg of node.arguments) {
			const fn = unwrapFunctionLike(arg)

			if (fn) return fn
		}
	}

	return null
}

/**
 * `propsType.getProperties()` on a union returns only the *intersection* of
 * arm properties, dropping discriminated-union members (e.g. Accordion's
 * `collapsible`, present only on the `type: 'single'` arm). Walk arms
 * separately so each arm-only prop surfaces with its own arm-bound symbol.
 *
 * Intersections are already merged by `getProperties()`, but their *arms*
 * may themselves contain unions — recurse so nested unions are still split.
 */
function collectAllProperties(type: ts.Type): ts.Symbol[] {
	const seen = new Map<string, ts.Symbol>()

	const visit = (t: ts.Type): void => {
		// Capture this level's view first — for unions, this gives us the
		// merged-type symbols for props common to all arms (each typed as a
		// union spanning every arm's value at that key). Then walk into arms
		// to recover any arm-only props that the intersection-by-key view
		// dropped.
		for (const sym of t.getProperties()) {
			if (!seen.has(sym.getName())) seen.set(sym.getName(), sym)
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

	return [...seen.values()]
}

/** Resolve the props type from the component's callable signature. */
function getPropsType(decl: ComponentDecl, checker: ts.TypeChecker): ts.Type | null {
	const type = checker.getTypeAtLocation(decl.callable)

	const signatures = type.getCallSignatures()

	const sig = signatures[0]

	const param = sig?.parameters[0]

	if (!param) return null

	return checker.getTypeOfSymbolAtLocation(param, decl.callable)
}

function buildPropDef(
	name: string,
	symbol: ts.Symbol,
	decl: ComponentDecl,
	checker: ts.TypeChecker,
	defaults: Map<string, string>,
): PropDef {
	const propType = checker.getTypeOfSymbolAtLocation(symbol, decl.callable)

	const inline = inlineSourceType(symbol)

	const prop: PropDef = {
		name,
		type: inline ?? formatPropType(propType, checker, decl.callable),
	}

	const references = extractReferences(prop.type, decl.callable, checker)

	if (references) prop.references = references

	const externalFrom = getExternalPackage(symbol)

	if (externalFrom) prop.externalFrom = externalFrom

	const defaultVal = defaults.get(name)

	if (defaultVal !== undefined) prop.default = defaultVal

	return prop
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
