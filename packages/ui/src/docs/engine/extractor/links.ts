import path from 'node:path'
import ts from 'typescript'
import { type LinkResolver, stripLinks } from './doc'
import type { DocLink } from './schema'
import { isExcludedSource } from './surface'
import { unaliasSymbol } from './ts-utils'

/**
 * A package-wide index of declarations a `{@link}` can target, keyed by name.
 * TSDoc links resolve across files without an import, so resolution can't lean
 * on lexical scope; this maps every PascalCase top-level declaration in project
 * source to its symbol, which the returned resolver turns into hover detail
 * (signature + summary) on demand. Results are memoized, including misses.
 */
export function createLinkResolver(program: ts.Program, packageDir: string): LinkResolver {
	const checker = program.getTypeChecker()

	const index = buildIndex(program, checker, packageDir)

	const cache = new Map<string, DocLink | null>()

	return (name) => {
		const cached = cache.get(name)

		if (cached !== undefined) return cached

		const symbol = index.get(name)

		const link = symbol ? toDocLink(name, symbol, checker) : null

		cache.set(name, link)

		return link
	}
}

/** Map every PascalCase top-level declaration in project source to its symbol; first declaration wins. */
function buildIndex(
	program: ts.Program,
	checker: ts.TypeChecker,
	packageDir: string,
): Map<string, ts.Symbol> {
	const index = new Map<string, ts.Symbol>()

	const add = (name: ts.Identifier | ts.BindingName | undefined) => {
		if (!name || !ts.isIdentifier(name)) return

		if (!/^[A-Z]/.test(name.text) || index.has(name.text)) return

		const symbol = checker.getSymbolAtLocation(name)

		if (symbol) index.set(name.text, symbol)
	}

	for (const sf of program.getSourceFiles()) {
		const file = sf.fileName

		// Skip external code and the documented package's own docs tree, the
		// same package-relative rule `surface.ts` uses — a relative check so a
		// package that merely lives under some `src/docs/` path (a fixture, this
		// engine's own home) isn't wrongly emptied by an absolute substring.
		const rel = path.relative(packageDir, file).split(path.sep).join('/')

		if (file.includes('/node_modules/') || isExcludedSource(rel)) continue

		for (const node of sf.statements) {
			if (
				ts.isFunctionDeclaration(node) ||
				ts.isClassDeclaration(node) ||
				ts.isTypeAliasDeclaration(node) ||
				ts.isInterfaceDeclaration(node) ||
				ts.isEnumDeclaration(node)
			) {
				add(node.name)
			} else if (ts.isVariableStatement(node) && isExported(node)) {
				for (const decl of node.declarationList.declarations) add(decl.name)
			}
		}
	}

	return index
}

/** Whether a statement carries the `export` modifier. */
function isExported(node: ts.VariableStatement): boolean {
	return node.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword) ?? false
}

/** Turn an indexed symbol into the hover card's signature header and summary. */
function toDocLink(name: string, symbol: ts.Symbol, checker: ts.TypeChecker): DocLink | null {
	const aliased = unaliasSymbol(symbol, checker)

	const link: DocLink = {}

	const signature = signatureOf(name, aliased, checker)

	if (signature) link.signature = signature

	const summary = stripLinks(
		ts.displayPartsToString(aliased.getDocumentationComment(checker)),
	).trim()

	if (summary) link.summary = summary

	return link.signature || link.summary ? link : null
}

/** A one-line signature header for the resolved target, by declaration kind. */
function signatureOf(name: string, symbol: ts.Symbol, checker: ts.TypeChecker): string | undefined {
	for (const decl of symbol.getDeclarations() ?? []) {
		if (ts.isTypeAliasDeclaration(decl)) return `type ${name}`

		if (ts.isInterfaceDeclaration(decl)) return `interface ${name}`

		if (ts.isClassDeclaration(decl)) return `class ${name}`

		if (ts.isEnumDeclaration(decl)) return `enum ${name}`

		if (ts.isFunctionDeclaration(decl)) return functionSignature(name, decl, checker)

		if (ts.isVariableDeclaration(decl)) return `const ${name}`
	}

	return undefined
}

/** `function name(params): return` via the checker, falling back to the bare keyword form. */
function functionSignature(
	name: string,
	decl: ts.FunctionDeclaration,
	checker: ts.TypeChecker,
): string {
	try {
		const signature = checker.getSignatureFromDeclaration(decl)

		if (signature) return `function ${name}${checker.signatureToString(signature)}`
	} catch {}

	return `function ${name}`
}
