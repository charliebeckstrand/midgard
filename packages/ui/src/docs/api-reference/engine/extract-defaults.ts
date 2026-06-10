import { ts } from 'ts-morph'

/**
 * Collect every default the component declares inline on its first parameter:
 * `function Foo({ size = 'md' })` → `{ size: "'md'" }`. Values keep their
 * source quoting.
 */
export function extractDefaults(callable: ts.SignatureDeclaration): Map<string, string> {
	const defaults = new Map<string, string>()

	const param = callable.parameters[0]

	if (!param || !ts.isObjectBindingPattern(param.name)) return defaults

	for (const element of param.name.elements) {
		if (!ts.isBindingElement(element)) continue

		if (!element.initializer) continue

		const name = ts.isIdentifier(element.name) ? element.name.text : null

		if (!name) continue

		defaults.set(name, element.initializer.getText())
	}

	return defaults
}
