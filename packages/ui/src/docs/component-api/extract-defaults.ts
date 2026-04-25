import ts from 'typescript'
import { unwrapFunctionLike } from './ts-utils'

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

	const param = unwrapFunctionLike(callable)?.parameters[0]

	if (!param || !ts.isObjectBindingPattern(param.name)) return defaults

	for (const element of param.name.elements) {
		if (!ts.isBindingElement(element)) continue

		if (!element.initializer) continue

		const name = ts.isIdentifier(element.name) ? element.name.text : null

		if (!name) continue

		// Use the source text directly so we preserve quotes, parens, etc.
		defaults.set(name, element.initializer.getText())
	}

	return defaults
}
