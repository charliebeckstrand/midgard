import ts from 'typescript'

/**
 * Walk a function body looking for a `return <jsx />` (or fragment / self-closing).
 * Stops at nested function scopes — their returns belong to those functions.
 */
export function returnsJsx(body: ts.Block): boolean {
	const found = { value: false }

	function visit(node: ts.Node): void {
		if (found.value) return

		if (ts.isReturnStatement(node) && node.expression) {
			let expr: ts.Expression = node.expression

			if (ts.isParenthesizedExpression(expr)) expr = expr.expression

			if (ts.isJsxElement(expr) || ts.isJsxFragment(expr) || ts.isJsxSelfClosingElement(expr)) {
				found.value = true

				return
			}
		}

		if (
			ts.isFunctionDeclaration(node) ||
			ts.isFunctionExpression(node) ||
			ts.isArrowFunction(node) ||
			ts.isMethodDeclaration(node)
		) {
			return
		}

		ts.forEachChild(node, visit)
	}

	visit(body)

	return found.value
}

/** Arrow function variant — handles both block bodies and concise expression bodies. */
export function arrowReturnsJsx(init: ts.ArrowFunction): boolean {
	if (ts.isBlock(init.body)) return returnsJsx(init.body)

	let expr: ts.Expression = init.body

	if (ts.isParenthesizedExpression(expr)) expr = expr.expression

	return ts.isJsxElement(expr) || ts.isJsxFragment(expr) || ts.isJsxSelfClosingElement(expr)
}
