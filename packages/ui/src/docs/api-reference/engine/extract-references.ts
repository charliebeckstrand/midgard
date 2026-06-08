import { ts } from 'ts-morph'
import { formatPropType } from './format-type'
import { unaliasSymbol } from './ts-utils'

const TYPE_NAME_RE = /\b([A-Z][A-Za-z0-9_]*)\b/g

const BUILTIN_TYPES = new Set([
	'Array',
	'Awaited',
	'Boolean',
	'CSSProperties',
	'Date',
	'Element',
	'ElementType',
	'Iterable',
	'JSXElementConstructor',
	'Map',
	'Number',
	'Omit',
	'Partial',
	'Pick',
	'Promise',
	'Readonly',
	'ReadonlyArray',
	'ReadonlyMap',
	'ReadonlySet',
	'Record',
	'Ref',
	'Required',
	'Set',
	'String',
	'WeakMap',
	'WeakSet',
])

/**
 * Recipe-engine internals — `Recipe`, `RecipeBase`, `ResolvedConfig`,
 * `VariantProps`, … — treated the same as `node_modules`: excluded from
 * reference cards.
 */
const ENGINE_PATH_SEGMENT = '/core/recipe/engine/'

/**
 * Resolves every named-type reference in a rendered prop type to its display
 * form for the docs panel. Recurses through references discovered inside each
 * definition.
 *
 * Object-shaped aliases render as an apparent-property body — the shape the
 * caller would actually pass — so `Pick<…>` / `Omit<…>` / intersection
 * compositions collapse to one card. Intersection arms from `node_modules` or
 * the recipe engine are dropped before properties are enumerated, keeping HTML
 * pass-throughs out of the panel (the pass-through section covers them).
 *
 * Scope is project source only — `node_modules`, React/DOM typings, recipe
 * engine internals, and built-in utility types (`Array`, `Pick`, …) are
 * excluded.
 */
export function extractReferences(
	formattedType: string,
	location: ts.Node,
	checker: ts.TypeChecker,
): Record<string, string> | undefined {
	const refs: Record<string, string> = {}

	// Each entry carries its resolution scope: top-level names resolve from
	// the component's call-site; recursively discovered names resolve from
	// their defining site, so transitively referenced types resolve without
	// being imported into the original module.
	const queue: { name: string; from: ts.Node }[] = collectTypeNames(formattedType).map((name) => ({
		name,
		from: location,
	}))

	const visited = new Set<string>()

	while (queue.length > 0) {
		const entry = queue.shift() as { name: string; from: ts.Node }

		if (visited.has(entry.name)) continue

		visited.add(entry.name)

		const resolved = resolveAliasDefinition(entry.name, entry.from, checker)

		if (!resolved) continue

		refs[entry.name] = resolved.text

		for (const next of collectTypeNames(resolved.text)) {
			if (!visited.has(next)) queue.push({ name: next, from: resolved.declaration })
		}
	}

	if (Object.keys(refs).length === 0) return undefined

	return refs
}

function collectTypeNames(text: string): string[] {
	const names: string[] = []

	// Blank out string and template-literal content so PascalCase tokens
	// inside them (`'PageHeader'`, `` `#${string}` ``) don't reach symbol
	// resolution.
	const stripped = text.replace(/'[^'\\]*'|"[^"\\]*"|`[^`\\]*`/g, '')

	for (const match of stripped.matchAll(TYPE_NAME_RE)) {
		const name = match[1]

		if (!name) continue

		if (BUILTIN_TYPES.has(name)) continue

		names.push(name)
	}

	return names
}

function resolveAliasDefinition(
	name: string,
	location: ts.Node,
	checker: ts.TypeChecker,
): { text: string; declaration: ts.Node } | null {
	// Include `Alias` so `import { type Foo } from '…'` is visible — type-only
	// imports bind as alias symbols rather than direct type symbols.
	const symbols = checker.getSymbolsInScope(location, ts.SymbolFlags.Type | ts.SymbolFlags.Alias)

	const symbol = symbols.find((s) => s.getName() === name)

	if (!symbol) return null

	const aliased = unaliasSymbol(symbol, checker)

	for (const decl of aliased.getDeclarations() ?? []) {
		if (isExternalDeclaration(decl)) continue

		if (ts.isTypeAliasDeclaration(decl)) {
			const shape = formatApparentShape(aliased, decl, checker)

			if (shape) return { text: dedent(shape), declaration: decl }

			const params = typeParameterList(decl.typeParameters)

			const body = `${params ? `${params} = ` : ''}${decl.type.getText()}`

			return { text: dedent(body), declaration: decl }
		}

		if (ts.isInterfaceDeclaration(decl)) {
			const shape = formatApparentShape(aliased, decl, checker)

			if (shape) return { text: dedent(shape), declaration: decl }

			return { text: dedent(formatInterface(decl)), declaration: decl }
		}
	}

	return null
}

/**
 * Declarations under `node_modules` or the recipe engine are opaque — neither
 * resolves to a reference card, and properties from them are filtered out of
 * apparent-shape bodies.
 */
function isExternalDeclaration(decl: ts.Declaration): boolean {
	const file = decl.getSourceFile().fileName

	return file.includes('/node_modules/') || file.includes(ENGINE_PATH_SEGMENT)
}

/**
 * Renders an object-shaped alias as its resolved apparent shape. Property
 * symbols whose every declaration is external are dropped, so
 * `Omit<HTMLAttributes<…>, …> & { … }` collapses to the project arm without
 * enumerating every HTML attr.
 *
 * Returns `null` for primitives, literal unions, and function types; the
 * caller falls back to source text for those, which is already concise.
 */
function formatApparentShape(
	symbol: ts.Symbol,
	decl: ts.TypeAliasDeclaration | ts.InterfaceDeclaration,
	checker: ts.TypeChecker,
): string | null {
	// Evaluate the type expression at the declaration site: mapped-type
	// wrappers (`Pick`, `Omit`, …) materialize their resolved properties this
	// way. `getDeclaredTypeOfSymbol` returns the type as written, keeping
	// `Pick<…, …>` as an opaque TypeReference with an empty `getProperties()`.
	const declaredType = ts.isTypeAliasDeclaration(decl)
		? checker.getTypeFromTypeNode(decl.type)
		: checker.getDeclaredTypeOfSymbol(symbol)

	// Function types and hybrid callables read better as source text — their
	// call signature is the whole point.
	if (declaredType.getCallSignatures().length > 0) return null

	const properties: { name: string; sym: ts.Symbol }[] = []

	for (const propSym of checker.getPropertiesOfType(declaredType)) {
		if (isExternalPropertySymbol(propSym)) continue

		properties.push({ name: propSym.getName(), sym: propSym })
	}

	if (properties.length === 0) return null

	const params = typeParameterList(decl.typeParameters)

	const lines = properties.map(({ name, sym }) => {
		const propType = checker.getTypeOfSymbolAtLocation(sym, decl)

		const optional = !!(sym.flags & ts.SymbolFlags.Optional)

		const formatted = formatPropType(propType, checker, decl)

		return `\t${name}${optional ? '?' : ''}: ${formatted}`
	})

	return `${params ? `${params} = ` : ''}{\n${lines.join('\n')}\n}`
}

/**
 * Returns true when every declaration site of the symbol is in `node_modules`
 * or the recipe engine — contributed by an external intersection arm, not part
 * of the project's surface API.
 */
function isExternalPropertySymbol(symbol: ts.Symbol): boolean {
	const declarations = symbol.getDeclarations() ?? []

	if (declarations.length === 0) return false

	return declarations.every(isExternalDeclaration)
}

function formatInterface(decl: ts.InterfaceDeclaration): string {
	const params = typeParameterList(decl.typeParameters)

	const heritage =
		decl.heritageClauses?.flatMap((clause) => clause.types.map((t) => t.getText())) ?? []

	const fullText = decl.getText()

	const braceStart = fullText.indexOf('{')

	const body = braceStart >= 0 ? fullText.slice(braceStart) : '{}'

	const heritagePart = heritage.length > 0 ? `extends ${heritage.join(', ')} ` : ''

	return `${params ? `${params} ` : ''}${heritagePart}${body}`
}

function typeParameterList(params: ts.NodeArray<ts.TypeParameterDeclaration> | undefined): string {
	if (!params || params.length === 0) return ''

	return `<${params.map((p) => p.getText()).join(', ')}>`
}

/**
 * Strips common leading indentation from a multi-line fragment, anchoring the
 * body at column 0 regardless of where the declaration appears in source
 * (top level, inside a namespace, …).
 */
function dedent(text: string): string {
	const lines = text.split('\n')

	if (lines.length <= 1) return text

	let minIndent = Infinity

	for (let i = 1; i < lines.length; i++) {
		const line = lines[i]

		if (!line || line.trim().length === 0) continue

		const match = line.match(/^[ \t]*/)

		const indent = match ? match[0].length : 0

		if (indent < minIndent) minIndent = indent
	}

	if (minIndent === Infinity || minIndent === 0) return text

	return lines.map((line, i) => (i === 0 ? line : line.slice(minIndent))).join('\n')
}
