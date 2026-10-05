import { ts } from 'ts-morph'
import type { ComponentApi } from '../../docs-legacy/engine/api-reference'
import { axesOf } from '../../docs-legacy/engine/axes'

/** The props of one component that its demo page never sets. */
export type PropGap = { component: string; props: string[] }

/** Read the string literals of an array literal, such as the `omit` of `<Axes>`. */
function stringsOf(node: ts.Expression): string[] {
	if (!ts.isArrayLiteralExpression(node)) return []

	return node.elements.filter(ts.isStringLiteralLike).map((element) => element.text)
}

/** Read the literal value of a JSX attribute, such as `of="Button"` or `omit={['href']}`. */
function attributeValue(attribute: ts.JsxAttribute): ts.Expression | undefined {
	const { initializer } = attribute

	if (!initializer) return undefined

	if (ts.isStringLiteral(initializer)) return initializer

	if (ts.isJsxExpression(initializer)) return initializer.expression

	return undefined
}

/**
 * Collect the props that a demo sets on each component, by the name of the
 * component. A JSX attribute sets its prop. An `<Axes>` sets each axis of the
 * component that its `of` names.
 *
 * @remarks
 * The reader is static. A spread outside `<Axes>` sets no prop that it can
 * name, so a prop that only a spread sets shows as a gap.
 */
export function propsSetIn(
	sources: readonly string[],
	api: readonly ComponentApi[],
): Map<string, Set<string>> {
	const set = new Map<string, Set<string>>()

	const add = (component: string, prop: string) => {
		const props = set.get(component) ?? new Set()

		props.add(prop)

		set.set(component, props)
	}

	for (const source of sources) {
		const sf = ts.createSourceFile(
			'demo.tsx',
			source,
			ts.ScriptTarget.Latest,
			true,
			ts.ScriptKind.TSX,
		)

		const visit = (node: ts.Node) => {
			if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
				const tag = node.tagName.getText(sf)

				const attributes = node.attributes.properties.filter(ts.isJsxAttribute)

				if (tag === 'Axes') {
					const of = attributes.find((a) => a.name.getText(sf) === 'of')

					const omit = attributes.find((a) => a.name.getText(sf) === 'omit')

					const name = of && attributeValue(of)

					const component =
						name && ts.isStringLiteralLike(name) && api.find((c) => c.name === name.text)

					if (component) {
						const omitted = omit ? stringsOf(attributeValue(omit) ?? ts.factory.createNull()) : []

						for (const axis of axesOf(component, omitted)) add(component.name, axis.name)
					}
				} else {
					for (const attribute of attributes) add(tag, attribute.name.getText(sf))
				}
			}

			ts.forEachChild(node, visit)
		}

		visit(sf)
	}

	return set
}

/**
 * List the documented props of each component that the demo sources never
 * set. A deprecated prop is not a gap. A component with no gap is not listed.
 */
export function propGaps(sources: readonly string[], api: readonly ComponentApi[]): PropGap[] {
	const set = propsSetIn(sources, api)

	return api
		.map((component) => ({
			component: component.name,
			props: component.props
				.filter((prop) => !prop.deprecated && !set.get(component.name)?.has(prop.name))
				.map((prop) => prop.name),
		}))
		.filter((gap) => gap.props.length > 0)
}
