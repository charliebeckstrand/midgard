import { ts } from 'ts-morph'
import { resolveTypeAliasTarget, typeRefName, unaliasSymbol } from './ts-utils'

/**
 * Collect every visible default value for a component's props. Combines two
 * sources, with inline destructuring winning on conflicts:
 *
 *   - **Inline destructured defaults** — `function Foo({ size = 'md' })`
 *     reads off the function parameter directly.
 *   - **CVA `defaultVariants`** — when the props type references
 *     `VariantProps<typeof recipe>`, follows the recipe to its `tv({...})` /
 *     `cva({...})` call and reads the `defaultVariants` object literal.
 *
 * Values are kept quoted (`'md'`) so they render the same way as the source.
 */
export function extractDefaults(
	callable: ts.SignatureDeclaration,
	annotation: ts.TypeNode | undefined,
	checker: ts.TypeChecker,
): Map<string, string> {
	const cva = annotation ? collectCvaDefaults(annotation, checker) : new Map()
	const inline = collectInlineDefaults(callable)

	// Inline wins — it's the value the component actually applies at runtime.
	return new Map<string, string>([...cva, ...inline])
}

// ---------------------------------------------------------------------------
// Inline destructured defaults
// ---------------------------------------------------------------------------

function collectInlineDefaults(callable: ts.SignatureDeclaration): Map<string, string> {
	const defaults = new Map<string, string>()

	const param = callable.parameters[0]

	if (!param || !ts.isObjectBindingPattern(param.name)) return defaults

	for (const element of param.name.elements) {
		if (!ts.isBindingElement(element)) continue

		if (!element.initializer) continue

		const name = ts.isIdentifier(element.name) ? element.name.text : null

		if (!name) continue

		// Source text preserves quotes, parens, etc.
		defaults.set(name, element.initializer.getText())
	}

	return defaults
}

// ---------------------------------------------------------------------------
// CVA defaults
// ---------------------------------------------------------------------------

function collectCvaDefaults(annotation: ts.TypeNode, checker: ts.TypeChecker): Map<string, string> {
	const out = new Map<string, string>()
	const visited = new Set<ts.Node>()

	walkAnnotation(annotation, out, visited, checker)

	return out
}

function walkAnnotation(
	node: ts.TypeNode,
	out: Map<string, string>,
	visited: Set<ts.Node>,
	checker: ts.TypeChecker,
): void {
	if (visited.has(node)) return

	visited.add(node)

	if (ts.isIntersectionTypeNode(node) || ts.isUnionTypeNode(node)) {
		for (const member of node.types) walkAnnotation(member, out, visited, checker)

		return
	}

	if (ts.isParenthesizedTypeNode(node)) {
		walkAnnotation(node.type, out, visited, checker)

		return
	}

	if (!ts.isTypeReferenceNode(node)) return

	const name = typeRefName(node.typeName)

	if (name === 'VariantProps') {
		const arg = node.typeArguments?.[0]

		if (arg) collectFromVariantProps(arg, out, checker)

		return
	}

	// Follow project type aliases — `VariantProps<...>` may live behind a
	// project-defined alias like `ButtonVariants`.
	const target = resolveTypeAliasTarget(node.typeName, checker)

	if (target) walkAnnotation(target, out, visited, checker)
}

/**
 * Given the type-argument of `VariantProps<T>`, follow `typeof recipe` to the
 * recipe's `tv({ ... })` initializer and read its `defaultVariants`. Aliased
 * forms (`type RecipeType = typeof recipe; VariantProps<RecipeType>`) are
 * resolved through one alias hop before bailing.
 */
function collectFromVariantProps(
	arg: ts.TypeNode,
	out: Map<string, string>,
	checker: ts.TypeChecker,
): void {
	const query = unwrapToTypeQuery(arg, checker)

	if (!query) return

	const symbol = checker.getSymbolAtLocation(
		ts.isIdentifier(query.exprName) ? query.exprName : query.exprName.right,
	)

	if (!symbol) return

	const aliased = unaliasSymbol(symbol, checker)

	for (const decl of aliased.getDeclarations() ?? []) {
		if (!ts.isVariableDeclaration(decl) || !decl.initializer) continue

		const defaults = readDefaultVariants(decl.initializer, checker)

		if (defaults) {
			for (const [k, v] of defaults) {
				if (!out.has(k)) out.set(k, v)
			}
		}
	}
}

/** Read `defaultVariants` out of a `tv({ ... })` / `cva({ ... })` call expression. */
function readDefaultVariants(
	node: ts.Expression,
	checker: ts.TypeChecker,
): Map<string, string> | null {
	if (!ts.isCallExpression(node)) return null

	const config = resolveToObjectLiteral(node.arguments[0], checker)

	if (!config) return null

	for (const prop of config.properties) {
		if (
			ts.isPropertyAssignment(prop) &&
			ts.isObjectLiteralExpression(prop.initializer) &&
			propertyKeyName(prop.name) === 'defaultVariants'
		) {
			const map = new Map<string, string>()

			for (const inner of prop.initializer.properties) {
				if (!ts.isPropertyAssignment(inner)) continue

				const key = propertyKeyName(inner.name)

				if (!key) continue

				map.set(key, inner.initializer.getText())
			}

			return map
		}
	}

	return null
}

/**
 * Resolve a type-argument to its underlying `typeof X` query node. Handles
 * the direct form and one level of project-alias indirection (`type R =
 * typeof recipe` followed by `VariantProps<R>`). Parenthesized type nodes are
 * unwrapped along the way.
 */
function unwrapToTypeQuery(node: ts.TypeNode, checker: ts.TypeChecker): ts.TypeQueryNode | null {
	if (ts.isParenthesizedTypeNode(node)) return unwrapToTypeQuery(node.type, checker)

	if (ts.isTypeQueryNode(node)) return node

	if (ts.isTypeReferenceNode(node)) {
		const target = resolveTypeAliasTarget(node.typeName, checker)

		if (target) return unwrapToTypeQuery(target, checker)
	}

	return null
}

/**
 * Read the string key of a property-assignment name. Accepts identifiers,
 * string literals, and computed names whose expression is a string literal
 * (`['size']: 'md'`). Returns null for anything else (numeric, dynamic).
 */
function propertyKeyName(name: ts.PropertyName): string | null {
	if (ts.isIdentifier(name) || ts.isStringLiteral(name)) return name.text

	if (ts.isComputedPropertyName(name) && ts.isStringLiteralLike(name.expression)) {
		return name.expression.text
	}

	return null
}

/**
 * Resolve an argument expression to the underlying object literal. Handles
 * direct literals (`tv({ ... })`), identifier indirection (`const config = {
 * ... }; tv(config)`), and the usual `as const` / `satisfies` / parens
 * wrappers authors put around CVA configs.
 */
function resolveToObjectLiteral(
	node: ts.Expression | undefined,
	checker: ts.TypeChecker,
): ts.ObjectLiteralExpression | null {
	if (!node) return null

	if (ts.isObjectLiteralExpression(node)) return node

	if (
		ts.isAsExpression(node) ||
		ts.isSatisfiesExpression(node) ||
		ts.isParenthesizedExpression(node)
	) {
		return resolveToObjectLiteral(node.expression, checker)
	}

	if (ts.isIdentifier(node)) {
		const symbol = checker.getSymbolAtLocation(node)

		if (!symbol) return null

		const aliased = unaliasSymbol(symbol, checker)

		for (const decl of aliased.getDeclarations() ?? []) {
			if (ts.isVariableDeclaration(decl) && decl.initializer) {
				return resolveToObjectLiteral(decl.initializer, checker)
			}
		}
	}

	return null
}
