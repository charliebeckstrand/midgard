import ts from 'typescript'

/**
 * Walk a props-type annotation looking for `VariantProps<typeof recipe>`
 * references. For each, follow `recipe` to its initializer — a CVA-style
 * `tv({ ... })` / `cva({ ... })` call — and read the `defaultVariants`
 * object literal. Returns one merged map of `{ variantName → 'value' }`.
 *
 * The values are quoted so they render the same way as inline destructured
 * defaults (e.g. `'zinc'` not `zinc`).
 */
export function extractCvaDefaults(
	annotation: ts.TypeNode,
	checker: ts.TypeChecker,
): Map<string, string> {
	const out = new Map<string, string>()

	const visited = new Set<ts.Node>()

	walk(annotation, out, visited, checker)

	return out
}

function walk(
	node: ts.TypeNode,
	out: Map<string, string>,
	visited: Set<ts.Node>,
	checker: ts.TypeChecker,
): void {
	if (visited.has(node)) return

	visited.add(node)

	if (ts.isIntersectionTypeNode(node) || ts.isUnionTypeNode(node)) {
		for (const member of node.types) walk(member, out, visited, checker)

		return
	}

	if (ts.isParenthesizedTypeNode(node)) {
		walk(node.type, out, visited, checker)

		return
	}

	if (!ts.isTypeReferenceNode(node)) return

	const name = typeRefName(node.typeName)

	if (name === 'VariantProps') {
		const arg = node.typeArguments?.[0]

		if (arg) collectFromVariantProps(arg, out, checker)

		return
	}

	// Follow project type aliases — the `VariantProps<...>` may live behind
	// a project-defined alias like `ButtonVariants`.
	const target = resolveTypeAliasTarget(node.typeName, checker)

	if (target) walk(target, out, visited, checker)
}

/**
 * Given the type-argument of `VariantProps<T>`, follow `typeof recipe` to the
 * recipe's `tv({ ... })` initializer and read its `defaultVariants`.
 */
function collectFromVariantProps(
	arg: ts.TypeNode,
	out: Map<string, string>,
	checker: ts.TypeChecker,
): void {
	if (!ts.isTypeQueryNode(arg)) return

	// `typeof X` — exprName references the X identifier.
	const symbol = checker.getSymbolAtLocation(
		ts.isIdentifier(arg.exprName) ? arg.exprName : arg.exprName.right,
	)

	if (!symbol) return

	const aliased = symbol.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(symbol) : symbol

	for (const decl of aliased.getDeclarations() ?? []) {
		if (!ts.isVariableDeclaration(decl) || !decl.initializer) continue

		const defaults = readDefaultVariants(decl.initializer)

		if (defaults) {
			for (const [k, v] of defaults) {
				if (!out.has(k)) out.set(k, v)
			}
		}
	}
}

/** Read `defaultVariants` out of a `tv({ ... })` / `cva({ ... })` call expression. */
function readDefaultVariants(node: ts.Expression): Map<string, string> | null {
	if (!ts.isCallExpression(node)) return null

	const config = node.arguments[0]

	if (!config || !ts.isObjectLiteralExpression(config)) return null

	for (const prop of config.properties) {
		if (
			ts.isPropertyAssignment(prop) &&
			ts.isIdentifier(prop.name) &&
			ts.isObjectLiteralExpression(prop.initializer) &&
			prop.name.text === 'defaultVariants'
		) {
			const map = new Map<string, string>()

			for (const inner of prop.initializer.properties) {
				if (!ts.isPropertyAssignment(inner)) continue

				if (!ts.isIdentifier(inner.name) && !ts.isStringLiteral(inner.name)) continue

				const key = inner.name.text

				map.set(key, inner.initializer.getText())
			}

			return map
		}
	}

	return null
}

function typeRefName(name: ts.EntityName): string {
	if (ts.isIdentifier(name)) return name.text
	return `${typeRefName(name.left)}.${name.right.text}`
}

function resolveTypeAliasTarget(name: ts.EntityName, checker: ts.TypeChecker): ts.TypeNode | null {
	const symbol = checker.getSymbolAtLocation(ts.isIdentifier(name) ? name : name.right)

	if (!symbol) return null

	const aliased = symbol.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(symbol) : symbol

	for (const decl of aliased.getDeclarations() ?? []) {
		if (ts.isTypeAliasDeclaration(decl)) return decl.type
	}

	return null
}
