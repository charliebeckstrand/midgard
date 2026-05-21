import {
	type ArrowFunction,
	type ExportedDeclarations,
	type FunctionDeclaration,
	type FunctionExpression,
	Node,
	type SourceFile,
	type TypeNode,
} from 'ts-morph'

type FunctionLike = FunctionDeclaration | FunctionExpression | ArrowFunction

export type ComponentDecl = {
	name: string
	/** The function/forwardRef/memo expression whose call signature gives us the props. */
	callable: FunctionLike
}

/**
 * Read an `index.ts` barrel file and return the public component-shaped names
 * (PascalCase value exports) in declaration order. Skips type-only exports,
 * hooks (`useFoo`), recipes (`fooRecipe`), and `export * from` re-exports.
 */
export function readPublicExports(indexFile: SourceFile): string[] {
	const names: string[] = []
	const seen = new Set<string>()

	for (const decl of indexFile.getExportDeclarations()) {
		if (decl.isTypeOnly()) continue

		for (const specifier of decl.getNamedExports()) {
			if (specifier.isTypeOnly()) continue

			const name = specifier.getAliasNode()?.getText() ?? specifier.getName()

			if (!/^[A-Z]/.test(name)) continue

			if (seen.has(name)) continue

			seen.add(name)
			names.push(name)
		}
	}

	return names
}

/**
 * Look up a component declaration by exported name within a barrel file.
 * Follows the export back to its underlying function or initializer and
 * unwraps `forwardRef(...)` / `memo(...)` wrappers so the caller receives
 * the actual function whose first parameter holds the props.
 */
export function findComponent(name: string, indexFile: SourceFile): ComponentDecl | null {
	const exported = indexFile.getExportedDeclarations().get(name)

	if (!exported) return null

	for (const decl of exported) {
		const callable = resolveCallable(decl)

		if (callable) return { name, callable }
	}

	return null
}

function resolveCallable(decl: ExportedDeclarations): FunctionLike | null {
	if (Node.isFunctionDeclaration(decl)) return decl

	if (Node.isVariableDeclaration(decl)) {
		const init = decl.getInitializer()

		if (init) return unwrapFunctionLike(init)
	}

	return null
}

/**
 * Walk a value expression to the first function/arrow form. Recurses into
 * call arguments so `forwardRef(<inner>)` / `memo(<inner>)` / similar wrappers
 * yield the inner function rather than the wrapping call expression.
 */
export function unwrapFunctionLike(node: Node): FunctionLike | null {
	if (
		Node.isFunctionDeclaration(node) ||
		Node.isFunctionExpression(node) ||
		Node.isArrowFunction(node)
	) {
		return node
	}

	if (Node.isCallExpression(node)) {
		for (const arg of node.getArguments()) {
			const fn = unwrapFunctionLike(arg)

			if (fn) return fn
		}
	}

	return null
}

/** Return the props parameter's type annotation node, when present. */
export function getPropsAnnotation(callable: FunctionLike): TypeNode | undefined {
	return callable.getParameters()[0]?.getTypeNode()
}
