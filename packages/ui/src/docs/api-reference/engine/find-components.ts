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
	/** Inner function — after unwrapping `forwardRef` / `memo` — whose first parameter holds the props. */
	callable: FunctionLike
}

/**
 * Return the PascalCase value exports of a barrel `index.ts` in declaration
 * order. Skips type-only exports, hooks, recipes, and `export * from`.
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
 * Resolve an exported name back to the component's callable — unwrapping
 * `forwardRef(...)` / `memo(...)` so the first parameter holds the props.
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
 * Walk into call arguments until the first function / arrow form, so
 * `forwardRef(<inner>)` and similar wrappers yield the inner function.
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

export function getPropsAnnotation(callable: FunctionLike): TypeNode | undefined {
	return callable.getParameters()[0]?.getTypeNode()
}
