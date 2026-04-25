import ts from 'typescript'

/**
 * Walk a component's callable expression to find destructured default values
 * — `function Foo({ size = 'md', ... }) { ... }` returns `{ size: "'md'" }`.
 *
 * Defaults from CVA's `defaultVariants` are picked up separately by the type
 * system (the CVA recipe's defaults are baked into the resolved variant type
 * union), so this helper only needs to handle inline parameter defaults.
 */
export function extractDefaults(callable: ts.Node): Map<string, string> {
	const defaults = new Map<string, string>()

	const params = getFirstParamPattern(callable)

	if (!params) return defaults

	for (const element of params.elements) {
		if (!ts.isBindingElement(element)) continue

		if (!element.initializer) continue

		const name = ts.isIdentifier(element.name) ? element.name.text : null

		if (!name) continue

		// Use the source text directly so we preserve quotes, parens, etc.
		defaults.set(name, element.initializer.getText())
	}

	return defaults
}

/** Get the destructured object pattern from a function/arrow expression's first parameter. */
function getFirstParamPattern(callable: ts.Node): ts.ObjectBindingPattern | null {
	if (
		ts.isFunctionDeclaration(callable) ||
		ts.isArrowFunction(callable) ||
		ts.isFunctionExpression(callable)
	) {
		const param = callable.parameters[0]

		if (param && ts.isObjectBindingPattern(param.name)) return param.name

		return null
	}

	// forwardRef(<inner>), memo(<inner>): unwrap to find the actual function expression
	if (ts.isCallExpression(callable)) {
		for (const arg of callable.arguments) {
			const pattern = getFirstParamPattern(arg)

			if (pattern) return pattern
		}
	}

	return null
}
