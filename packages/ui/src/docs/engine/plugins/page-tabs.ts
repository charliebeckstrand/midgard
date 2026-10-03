import ts from '@typescript/typescript6'
import { parseSource } from './ts-source'

/** The tabs of a demo's `PageTabs`: the tab at the page's own path, and the others. */
export type PageTabsInfo = { defaultValue: string; others: string[] }

/**
 * Read the `PageTabs` element of a demo source. It gives the `defaultValue`,
 * and the `value` of each `Tab` that belongs to the element. A `Tab` inside a
 * nested `Tabs` belongs to that `Tabs`. A value is a string literal, or the
 * item of a `.map` over a module constant array of string literals. Any other
 * value is an error, because the build cannot list the page of that tab.
 * Returns null when the demo has no `PageTabs`.
 */
export function parsePageTabs(fileName: string, source: string): PageTabsInfo | null {
	const sf = parseSource(fileName, source)

	const arrays = new Map<string, string[]>()

	for (const stmt of sf.statements) {
		if (!ts.isVariableStatement(stmt)) continue

		for (const decl of stmt.declarationList.declarations) {
			if (!ts.isIdentifier(decl.name) || !decl.initializer) continue

			const init = ts.isAsExpression(decl.initializer)
				? decl.initializer.expression
				: decl.initializer

			if (!ts.isArrayLiteralExpression(init)) continue

			if (init.elements.every(ts.isStringLiteral)) {
				arrays.set(
					decl.name.text,
					init.elements.map((el) => (el as ts.StringLiteral).text),
				)
			}
		}
	}

	let found: PageTabsInfo | null = null

	const fail = (node: ts.Node, message: string): never => {
		const { line } = sf.getLineAndCharacterOfPosition(node.getStart(sf))

		throw new Error(`${fileName}:${line + 1}: ${message}`)
	}

	const tagOf = (node: ts.Node) =>
		ts.isJsxElement(node)
			? node.openingElement.tagName.getText(sf)
			: ts.isJsxSelfClosingElement(node)
				? node.tagName.getText(sf)
				: null

	const attrsOf = (node: ts.JsxElement | ts.JsxSelfClosingElement) =>
		ts.isJsxElement(node) ? node.openingElement.attributes : node.attributes

	const literalAttr = (node: ts.JsxElement | ts.JsxSelfClosingElement, name: string) => {
		for (const prop of attrsOf(node).properties) {
			if (!ts.isJsxAttribute(prop) || prop.name.getText(sf) !== name) continue

			const init = prop.initializer

			if (init && ts.isStringLiteral(init)) return init.text

			if (init && ts.isJsxExpression(init) && init.expression) return init.expression
		}

		return undefined
	}

	// The values that a `Tab` value expression can take: a literal, or the
	// parameter of a `.map` over a constant array.
	const valuesOf = (tab: ts.Node, expr: ts.Expression): string[] => {
		if (ts.isStringLiteral(expr) || ts.isNoSubstitutionTemplateLiteral(expr)) return [expr.text]

		if (ts.isIdentifier(expr)) {
			for (let node: ts.Node | undefined = tab; node; node = node.parent) {
				if (!ts.isArrowFunction(node) && !ts.isFunctionExpression(node)) continue

				const param = node.parameters[0]

				const call = node.parent

				if (
					param &&
					ts.isIdentifier(param.name) &&
					param.name.text === expr.text &&
					ts.isCallExpression(call) &&
					ts.isPropertyAccessExpression(call.expression) &&
					call.expression.name.text === 'map' &&
					ts.isIdentifier(call.expression.expression)
				) {
					const items = arrays.get(call.expression.expression.text)

					if (items) return items
				}
			}
		}

		return fail(tab, 'a Tab of PageTabs needs a literal value, or an item of a constant array')
	}

	const collect = (node: ts.Node, into: Set<string>) => {
		const tag = tagOf(node)

		// A nested `Tabs` owns the tabs inside it.
		if (tag === 'Tabs' || tag === 'PageTabs') return

		if (tag === 'Tab') {
			const value = literalAttr(node as ts.JsxElement | ts.JsxSelfClosingElement, 'value')

			if (value === undefined) fail(node, 'a Tab of PageTabs needs a value')

			for (const v of typeof value === 'string'
				? [value]
				: valuesOf(node, value as ts.Expression)) {
				into.add(v)
			}
		}

		ts.forEachChild(node, (child) => collect(child, into))
	}

	const visit = (node: ts.Node) => {
		if (tagOf(node) === 'PageTabs') {
			if (found) fail(node, 'a demo has one PageTabs')

			const el = node as ts.JsxElement | ts.JsxSelfClosingElement

			const defaultValue = literalAttr(el, 'defaultValue')

			if (typeof defaultValue !== 'string') fail(node, 'PageTabs needs a literal defaultValue')

			const values = new Set<string>()

			ts.forEachChild(node, (child) => collect(child, values))

			values.delete(defaultValue as string)

			found = { defaultValue: defaultValue as string, others: [...values] }
		}

		ts.forEachChild(node, visit)
	}

	visit(sf)

	return found
}
