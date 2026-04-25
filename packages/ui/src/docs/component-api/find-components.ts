import ts from 'typescript'

export type ComponentDecl = {
	name: string
	/** The function/forwardRef/memo expression whose call signature gives us the props. */
	callable: ts.Node
	/** The symbol exported from the file (so we can read its type). */
	symbol: ts.Symbol
	/** Source file the export lives in — used to attribute defaults from the same file. */
	sourceFile: ts.SourceFile
}

/**
 * Read an `index.ts` barrel file and return the public component-shaped names
 * in declaration order — matches v1's `parsePublicExports` filter.
 */
export function readPublicExports(file: ts.SourceFile): string[] {
	const names: string[] = []

	const seen = new Set<string>()

	const visit = (node: ts.Node) => {
		if (ts.isExportDeclaration(node) && node.exportClause && ts.isNamedExports(node.exportClause)) {
			for (const specifier of node.exportClause.elements) {
				if (specifier.isTypeOnly) continue

				const exported = specifier.name.text

				if (!/^[A-Z]/.test(exported)) continue

				if (seen.has(exported)) continue

				seen.add(exported)

				names.push(exported)
			}
		}
	}

	file.forEachChild(visit)

	return names
}

/**
 * Look up a component declaration by name within a directory's source files.
 * Searches each file's exports for the given name and returns the underlying
 * function or initializer node we'll inspect for props.
 */
export function findComponent(
	name: string,
	files: ts.SourceFile[],
	checker: ts.TypeChecker,
): ComponentDecl | null {
	for (const file of files) {
		const fileSymbol = checker.getSymbolAtLocation(file)

		const exports = fileSymbol ? checker.getExportsOfModule(fileSymbol) : []

		const match = exports.find((s) => s.getName() === name)

		if (!match) continue

		const decl = resolveCallable(match, checker)

		if (!decl) continue

		return { name, callable: decl, symbol: match, sourceFile: file }
	}

	return null
}

/**
 * Resolve an exported symbol to the underlying callable expression that
 * defines the component. Handles `function Foo()`, `const Foo = forwardRef(...)`,
 * `const Foo = memo(...)`, and re-exports through aliasing.
 */
function resolveCallable(symbol: ts.Symbol, checker: ts.TypeChecker): ts.Node | null {
	let current = symbol

	if (current.flags & ts.SymbolFlags.Alias) {
		current = checker.getAliasedSymbol(current)
	}

	const declarations = current.getDeclarations() ?? []

	for (const decl of declarations) {
		if (ts.isFunctionDeclaration(decl)) return decl

		if (ts.isVariableDeclaration(decl) && decl.initializer) return decl.initializer
	}

	return null
}
