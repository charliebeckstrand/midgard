import { ts } from 'ts-morph'
import type { PropDef } from '../types'
import { extractReferences } from './extract-references'
import { formatPropType } from './format-type'
import { unaliasSymbol } from './ts-utils'

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
 * Collects props from every union and intersection arm individually. Walking
 * arms separately surfaces arm-only discriminated members and collects every
 * contributing type for props that appear in multiple arms with distinct types.
 * Recursion splits nested unions within intersection arms.
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
	const authored = authoredTypeText(symbol, checker)

	const prop: PropDef = {
		name,
		type: authored ?? formatPropTypes(propTypes, callable, checker),
	}

	const references = extractReferences(prop.type, callable, checker)

	if (references) prop.references = references

	const externalFrom = getExternalPackage(symbol)

	if (externalFrom) prop.externalFrom = externalFrom

	const description = jsDocSummary(symbol, checker)

	if (description) prop.description = description

	const tags = jsDocTags(symbol, checker)

	if (tags.example) prop.example = tags.example

	if (tags.deprecated !== undefined) prop.deprecated = tags.deprecated

	if (isRequired(symbol)) prop.required = true

	// The destructured default is the value the component actually applies;
	// `@default` documents props that aren't destructured, so it only fills in.
	const defaultVal = defaults.get(name)

	if (defaultVal !== undefined) prop.default = defaultVal
	else if (tags.default !== undefined) prop.default = tags.default

	return prop
}

/** Prose summary of a symbol's TSDoc (the leading `/** … *\/`, tags stripped). */
export function jsDocSummary(symbol: ts.Symbol, checker: ts.TypeChecker): string | undefined {
	const text = ts.displayPartsToString(symbol.getDocumentationComment(checker)).trim()

	return text.length > 0 ? text : undefined
}

type PropTags = { default?: string; example?: string; deprecated?: string | true }

/** `@default` / `@defaultValue`, `@example`, and `@deprecated` from a symbol's TSDoc. */
export function jsDocTags(symbol: ts.Symbol, checker: ts.TypeChecker): PropTags {
	const out: PropTags = {}

	for (const tag of symbol.getJsDocTags(checker)) {
		const text = ts.displayPartsToString(tag.text ?? []).trim()

		switch (tag.name) {
			case 'default':
			case 'defaultValue':
				if (text) out.default = text

				break
			case 'example':
				if (text) out.example = text

				break
			case 'deprecated':
				out.deprecated = text.length > 0 ? text : true

				break
		}
	}

	return out
}

/**
 * Whether a prop must be supplied. Trusts `SymbolFlags.Optional`; falls back to
 * the authored `?` token so a prop optional in any union/intersection arm reads
 * as optional (you may omit it), mirroring `collectAllProperties`.
 */
export function isRequired(symbol: ts.Symbol): boolean {
	if (symbol.flags & ts.SymbolFlags.Optional) return false

	const declarations = symbol.getDeclarations() ?? []

	if (declarations.length === 0) return false

	return !declarations.some((d) => ts.isPropertySignature(d) && d.questionToken !== undefined)
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
 * Prefer the author's source text over the formatter's expansion when the
 * declared type is either a mapped type (`{ [K in keyof T]?: … }`) or a
 * reference to a project-source alias / interface (`Responsive<number>`,
 * `GridGap`, `ButtonVariants`). The optional `?` lives on the property name,
 * not the type node, so `getText()` is already clean. Everything else — inline
 * unions, primitives, external and built-in references — returns null and
 * flows through `formatPropType` for alias resolution.
 */
function authoredTypeText(symbol: ts.Symbol, checker: ts.TypeChecker): string | null {
	const decl = symbol.getDeclarations()?.[0]

	if (!decl || !ts.isPropertySignature(decl) || !decl.type) return null

	const node = decl.type

	if (ts.isMappedTypeNode(node)) return node.getText()

	if (ts.isTypeReferenceNode(node) && referencesProjectType(node.typeName, checker)) {
		return node.getText()
	}

	return null
}

/**
 * True when a type-reference name resolves to a type alias or interface
 * declared in project source. Type parameters, primitives, and node_modules
 * types (React, DOM, libraries) return false, so they fall through to the
 * formatter and keep their existing rendering.
 */
function referencesProjectType(typeName: ts.EntityName, checker: ts.TypeChecker): boolean {
	const id = ts.isIdentifier(typeName) ? typeName : typeName.right

	const symbol = checker.getSymbolAtLocation(id)

	if (!symbol) return false

	const declarations = unaliasSymbol(symbol, checker).getDeclarations() ?? []

	const aliasOrInterface = declarations.some(
		(d) => ts.isTypeAliasDeclaration(d) || ts.isInterfaceDeclaration(d),
	)

	if (!aliasOrInterface) return false

	return declarations.some((d) => !d.getSourceFile().fileName.includes('/node_modules/'))
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
