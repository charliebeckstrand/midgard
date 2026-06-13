import { Node, type Project, ts } from 'ts-morph'
import { stripLinks } from '../link-syntax'
import type { DocLink } from '../types'
import type { LinkResolver } from './extract-doc'
import { unaliasSymbol } from './ts-utils'

/**
 * A package-wide index of declarations a `{@link}` can target, keyed by name.
 * TSDoc links resolve across files without an import, so resolution can't lean
 * on lexical scope; this maps every PascalCase top-level declaration in project
 * source to its symbol, which the returned resolver turns into hover detail
 * (signature + summary) on demand. Results are memoized, including misses.
 */
export function createLinkResolver(project: Project): LinkResolver {
	const checker = project.getTypeChecker().compilerObject

	const index = buildIndex(project)

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
function buildIndex(project: Project): Map<string, ts.Symbol> {
	const index = new Map<string, ts.Symbol>()

	const add = (name: string | undefined, node: Node) => {
		if (!name || !/^[A-Z]/.test(name) || index.has(name)) return

		const symbol = node.getSymbol()?.compilerSymbol

		if (symbol) index.set(name, symbol)
	}

	for (const sf of project.getSourceFiles()) {
		const file = sf.getFilePath()

		if (file.includes('/node_modules/') || file.includes('/docs/')) continue

		for (const node of sf.getStatements()) {
			if (
				Node.isFunctionDeclaration(node) ||
				Node.isClassDeclaration(node) ||
				Node.isTypeAliasDeclaration(node) ||
				Node.isInterfaceDeclaration(node) ||
				Node.isEnumDeclaration(node)
			) {
				add(node.getName(), node)
			} else if (Node.isVariableStatement(node) && node.isExported()) {
				for (const decl of node.getDeclarations()) add(decl.getName(), decl)
			}
		}
	}

	return index
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
