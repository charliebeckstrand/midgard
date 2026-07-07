import { ts } from 'ts-morph'

/**
 * Collect every default the component declares inline on its first parameter:
 * `function Foo({ size = 'md' })` → `{ size: "'md'" }`. Values keep their source
 * quoting. A default that names a module-level `const` literal
 * (`triggerShortcut = DEFAULT_TRIGGER_SHORTCUT`) resolves to that literal, so the
 * public API shows the value rather than the internal symbol.
 */
export function extractDefaults(callable: ts.SignatureDeclaration): Map<string, string> {
	const defaults = new Map<string, string>()

	const param = callable.parameters[0]

	if (!param || !ts.isObjectBindingPattern(param.name)) return defaults

	for (const element of param.name.elements) {
		if (!ts.isBindingElement(element)) continue

		if (!element.initializer) continue

		// A renamed binding (`{ size: sizeProp = 'md' }`) carries the public prop
		// name on `propertyName`; `name` is the local binding. Key the default
		// under the prop so it matches the extracted prop table, not the local.
		const key = element.propertyName ?? element.name

		const name = ts.isIdentifier(key) ? key.text : null

		if (!name) continue

		defaults.set(name, defaultText(element.initializer))
	}

	return defaults
}

/**
 * Source text of a destructured default. A bare identifier that names a same-file
 * `const` literal collapses to that literal; every other shape keeps its own
 * source text, leaving inline values and unresolved references untouched.
 */
function defaultText(initializer: ts.Expression): string {
	if (ts.isIdentifier(initializer)) {
		const literal = resolveConstLiteral(initializer)

		if (literal !== null) return literal
	}

	return initializer.getText()
}

/**
 * Literal initializer of the same-file `const NAME`; null when the name resolves
 * to no top-level `const`, or to one whose value isn't a literal (a call, JSX, a
 * reference), which stays as the authored identifier.
 */
function resolveConstLiteral(id: ts.Identifier): string | null {
	for (const stmt of id.getSourceFile().statements) {
		if (!ts.isVariableStatement(stmt)) continue

		if (!(stmt.declarationList.flags & ts.NodeFlags.Const)) continue

		for (const decl of stmt.declarationList.declarations) {
			if (!ts.isIdentifier(decl.name) || decl.name.text !== id.text) continue

			return decl.initializer ? literalText(decl.initializer) : null
		}
	}

	return null
}

/** Source text of a literal-valued expression, unwrapping `as const`; null for non-literals. */
function literalText(node: ts.Expression): string | null {
	if (ts.isAsExpression(node)) return literalText(node.expression)

	return isLiteral(node) ? node.getText() : null
}

/** Whether an expression reads as a concrete default value: a primitive, array, or object literal. */
function isLiteral(node: ts.Expression): boolean {
	return (
		ts.isStringLiteralLike(node) ||
		ts.isNumericLiteral(node) ||
		ts.isBigIntLiteral(node) ||
		node.kind === ts.SyntaxKind.TrueKeyword ||
		node.kind === ts.SyntaxKind.FalseKeyword ||
		node.kind === ts.SyntaxKind.NullKeyword ||
		ts.isArrayLiteralExpression(node) ||
		ts.isObjectLiteralExpression(node) ||
		(ts.isPrefixUnaryExpression(node) && ts.isNumericLiteral(node.operand))
	)
}
