import { ts } from 'ts-morph'
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
 * Resolve every named-type reference appearing inside a rendered prop type to
 * its source text — so the docs can show a hover tooltip with the alias'
 * definition. Recurses through references found inside each definition.
 *
 * Resolution scope is project source only (no node_modules, no React/DOM
 * typings). Built-in TS / utility types are excluded so we don't try to inline
 * `Array`, `Pick`, etc.
 */
export function extractReferences(
	formattedType: string,
	location: ts.Node,
	checker: ts.TypeChecker,
): Record<string, string> | undefined {
	const refs: Record<string, string> = {}

	// Each queued entry carries the location whose scope should resolve it.
	// Top-level names resolve from the component's call-site; recursively
	// discovered names resolve from the *defining* node's site so that types
	// only imported into the original module aren't required to be re-imported.
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

	// Blank out string and template literal content so PascalCase tokens
	// spelled out inside them never reach symbol resolution.
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
	// Include `Alias` so type-only imports (`import { type Foo } from '…'`)
	// are visible — those bind as alias symbols, not direct type symbols.
	const symbols = checker.getSymbolsInScope(location, ts.SymbolFlags.Type | ts.SymbolFlags.Alias)

	const symbol = symbols.find((s) => s.getName() === name)

	if (!symbol) return null

	const aliased = unaliasSymbol(symbol, checker)

	for (const decl of aliased.getDeclarations() ?? []) {
		if (decl.getSourceFile().fileName.includes('/node_modules/')) continue

		if (ts.isTypeAliasDeclaration(decl)) {
			const params = typeParameterList(decl.typeParameters)
			const body = `${params ? `${params} = ` : ''}${decl.type.getText()}`

			return { text: dedent(body), declaration: decl }
		}

		if (ts.isInterfaceDeclaration(decl)) {
			return { text: dedent(formatInterface(decl)), declaration: decl }
		}
	}

	return null
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
 * Strip the common leading indentation from a multi-line source fragment so
 * the body is anchored at column 0 regardless of where the declaration sat in
 * its own source file (top level, inside a namespace, etc.).
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
