import ts from 'typescript'
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
 * Resolve every named-type reference appearing inside a rendered prop type
 * to its source text — so the docs can show a hover tooltip with the alias'
 * definition. Recurses through references found inside each definition.
 *
 * Resolution scope is project source only (no node_modules, no React/DOM
 * typings). Built-in TS / utility types are excluded so we don't try to
 * inline `Array`, `Pick`, etc.
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

	for (const match of text.matchAll(TYPE_NAME_RE)) {
		const name = match[1]

		if (!name) continue

		if (BUILTIN_TYPES.has(name)) continue

		names.push(name)
	}

	return names
}

/**
 * Look up a name via the type checker (using the component's call-site as
 * the resolution context) and return the alias' RHS source text — or null
 * if the name doesn't resolve to a project-source type alias.
 */
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
			return { text: normalizeWhitespace(decl.type.getText()), declaration: decl }
		}

		if (ts.isInterfaceDeclaration(decl)) {
			return { text: normalizeWhitespace(formatInterface(decl)), declaration: decl }
		}
	}

	return null
}

function formatInterface(decl: ts.InterfaceDeclaration): string {
	const heritage =
		decl.heritageClauses?.flatMap((clause) => clause.types.map((t) => t.getText())) ?? []

	const members = decl.members.map((m) => m.getText().trim()).join(' ')

	const heritagePart = heritage.length > 0 ? `extends ${heritage.join(', ')} ` : ''

	return `${heritagePart}{ ${members} }`
}

function normalizeWhitespace(s: string): string {
	return s.replace(/\s+/g, ' ').trim()
}
