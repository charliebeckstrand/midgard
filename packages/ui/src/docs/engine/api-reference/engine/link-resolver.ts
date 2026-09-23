import { Node, type Project } from 'ts-morph'
import { isPascalCase } from '../../identifiers'
import type { LinkResolver } from './extract-doc'

/** One extraction pass's link index: two lookups over one walk of the program. */
export type LinkIndex = {
	/** Whether the index holds a name. */
	resolve: LinkResolver
	/** The source file that declares a name, or `undefined` when nothing indexes it. */
	targetFile: (name: string) => string | undefined
}

/**
 * Index every declaration a `{@link}` can target, keyed by name. TSDoc links
 * resolve across files without an import, so resolution can't lean on lexical
 * scope. This maps every PascalCase top-level declaration in project source to
 * the file that declares it. `resolve` tells whether a name is indexed. The
 * renderer shows a symbol reference as plain text, so the index computes no
 * signature or summary for a target.
 *
 * One build serves both lookups, because the walk covers every file in the
 * program. `extraction.bench.ts` measures it; measure there rather than through
 * a pass, which varies by more than the walk costs. `extractionContext` owns
 * how long a build lives.
 */
export function createLinkIndex(project: Project): LinkIndex {
	const index = buildIndex(project)

	return { resolve: (name) => index.has(name), targetFile: (name) => index.get(name) }
}

/** Map every PascalCase top-level declaration in project source to the file that declares it; first declaration wins. */
function buildIndex(project: Project): Map<string, string> {
	const index = new Map<string, string>()

	// `file` is loop-invariant across a source file's declarations, so it comes
	// from the loop rather than a `node.getSourceFile()` call for each name.
	const add = (name: string | undefined, node: Node, file: string) => {
		if (!name || !isPascalCase(name) || index.has(name)) return

		if (node.getSymbol()) index.set(name, file)
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
				add(node.getName(), node, file)
			} else if (Node.isVariableStatement(node) && node.isExported()) {
				for (const decl of node.getDeclarations()) add(decl.getName(), decl, file)
			}
		}
	}

	return index
}
