import { ts } from 'ts-morph'
import type { ComponentApi } from '../../docs-legacy/engine/api-reference'
import { axesOf } from '../../docs-legacy/engine/axes'

/** A hand-written example that shows nothing that the generated axes do not show. */
export type RedundantExample = { title: string; line: number; reason: string }

/** A title that names no use. The playground of an `<Axes>` is the default of its component. */
const GENERIC_TITLES = /^(default|basic|usage|example)$/i

/** The attributes that do not change what an example shows. */
const IGNORED_ATTRIBUTES = new Set(['key'])

/** The attributes of `Example` that frame content of their own. */
const FRAME_SLOTS = ['prefix', 'actions', 'preview', 'footer']

/** Read the literal value of a JSX attribute, such as `of="Button"` or `omit={['href']}`. */
function attributeValue(attribute: ts.JsxAttribute): ts.Expression | undefined {
	const { initializer } = attribute

	if (!initializer) return undefined

	if (ts.isStringLiteral(initializer)) return initializer

	if (ts.isJsxExpression(initializer)) return initializer.expression

	return undefined
}

/** Find the attribute `name` of a JSX element. */
function attributeOf(
	element: ts.JsxOpeningLikeElement,
	name: string,
	sf: ts.SourceFile,
): ts.Expression | undefined {
	const attribute = element.attributes.properties
		.filter(ts.isJsxAttribute)
		.find((a) => a.name.getText(sf) === name)

	return attribute && attributeValue(attribute)
}

/** Read the string literals of an array literal, such as the `omit` of `<Axes>`. */
function stringsOf(node: ts.Expression | undefined): string[] {
	if (!node || !ts.isArrayLiteralExpression(node)) return []

	return node.elements.filter(ts.isStringLiteralLike).map((element) => element.text)
}

/**
 * Collect the shape of an attribute value: the length of an array literal as
 * `path[n]`, and each key of an object literal as `path.key`. Thus a chart
 * with one series, or a series with a `color`, differs from the one that the
 * axes render.
 */
function shapeOf(node: ts.Node, path: string, into: Set<string>): void {
	if (ts.isArrayLiteralExpression(node)) {
		into.add(`${path}[${node.elements.length}]`)

		for (const element of node.elements) shapeOf(element, path, into)

		return
	}

	if (ts.isObjectLiteralExpression(node)) {
		for (const property of node.properties) {
			const key = property.name && ts.isIdentifier(property.name) ? property.name.text : null

			if (!key) continue

			into.add(`${path}.${key}`)

			if (ts.isPropertyAssignment(property)) shapeOf(property.initializer, `${path}.${key}`, into)
		}
	}
}

/**
 * The text of a literal attribute value, such as `'mercator'` or `0`, or
 * `null` for another value. A shorthand attribute, such as `disabled`, reads
 * as `true`.
 */
function literalOf(value: ts.Expression | undefined): string | null {
	if (!value) return 'true'

	if (ts.isStringLiteralLike(value) || ts.isNumericLiteral(value)) return value.text

	if (value.kind === ts.SyntaxKind.TrueKeyword) return 'true'

	if (value.kind === ts.SyntaxKind.FalseKeyword) return 'false'

	return null
}

/** The name of the tag of a JSX element, or `null` for another node. */
function tagOf(node: ts.Node, sf: ts.SourceFile): string | null {
	return ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)
		? node.tagName.getText(sf)
		: null
}

/**
 * The declarations of a file, by name: the initializer of each variable, such
 * as `const icons = <Menu />`, and the body of each function, such as a local
 * example component.
 */
function declarationsOf(sf: ts.SourceFile): Map<string, ts.Node> {
	const declarations = new Map<string, ts.Node>()

	const visit = (node: ts.Node) => {
		if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer)
			declarations.set(node.name.text, node.initializer)

		if (ts.isFunctionDeclaration(node) && node.name && node.body)
			declarations.set(node.name.text, node.body)

		ts.forEachChild(node, visit)
	}

	visit(sf)

	return declarations
}

/**
 * Collect what a subtree sets. Each JSX element gives its tag as `Tag`, each
 * occurrence of the tag as `Tag#n`, its parent tag as `Parent>Tag`, and each
 * attribute as `Tag.prop`, with a literal value also as `Tag.prop=value`. An
 * object literal elsewhere gives each key as `{}.key`. Each variable of the file that the subtree names
 * gives `$name`, and the reader follows it to its initializer. A spread sets
 * no prop that the reader can name.
 */
function settingsIn(
	node: ts.Node,
	sf: ts.SourceFile,
	declarations: ReadonlyMap<string, ts.Node>,
	into = new Set<string>(),
): Set<string> {
	const count = new Map<string, number>()

	const followed = new Set<string>()

	const visit = (child: ts.Node, parent: string | null) => {
		if (ts.isIdentifier(child) && declarations.has(child.text) && !followed.has(child.text)) {
			followed.add(child.text)

			into.add(`$${child.text}`)

			visit(declarations.get(child.text) as ts.Node, parent)
		}

		// An object literal outside an attribute, such as the options of a
		// `toast()` call in a handler, gives each key as `{}.key`.
		if (ts.isObjectLiteralExpression(child) && !ts.isJsxExpression(child.parent))
			shapeOf(child, '{}', into)

		const tag = tagOf(child, sf)

		// A local component, such as `<ClosableExample />`, shows what its body renders.
		if (tag && declarations.has(tag)) {
			if (!followed.has(tag)) {
				followed.add(tag)

				visit(declarations.get(tag) as ts.Node, parent)
			}
		} else if (tag && ts.isJsxOpeningLikeElement(child)) {
			const n = (count.get(tag) ?? 0) + 1

			count.set(tag, n)

			into.add(tag)

			into.add(`${tag}#${n}`)

			if (parent) into.add(`${parent}>${tag}`)

			for (const attribute of child.attributes.properties.filter(ts.isJsxAttribute)) {
				const name = attribute.name.getText(sf)

				if (IGNORED_ATTRIBUTES.has(name)) continue

				into.add(`${tag}.${name}`)

				const value = attributeValue(attribute)

				if (value) shapeOf(value, `${tag}.${name}`, into)

				const literal = literalOf(value)

				if (literal !== null) into.add(`${tag}.${name}=${literal}`)
			}
		}

		// The children of an element sit beside its opening element, so the
		// element passes its tag down.
		const next = ts.isJsxElement(child) ? child.openingElement.tagName.getText(sf) : parent

		ts.forEachChild(child, (grandchild) => visit(grandchild, next))
	}

	visit(node, null)

	return into
}

/** Whether a JSX element is the opening element of `tag`. */
function isTag(node: ts.Node, tag: string, sf: ts.SourceFile): node is ts.JsxOpeningLikeElement {
	return (
		(ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) &&
		node.tagName.getText(sf) === tag
	)
}

/**
 * List the hand-written examples of a demo page that show nothing new, each
 * with the reason.
 *
 * @remarks
 * The reader is static. Each example gives what its children and its frame
 * slots set: each tag, attribute, literal value, nesting, count of a tag,
 * variable, and shape of an attribute value. It follows a local component or variable to its
 * declaration. The text of an element does not count, so an example that
 * differs only in its words shows nothing new.
 *
 * An example is redundant when one `<Axes>` covers each thing that it sets,
 * except the literal values, because the axes show each literal value of an
 * axis. One `<Axes>` covers what its `render` sets, and each axis of its
 * component.
 * An example is also redundant when it sets the same things as an earlier
 * example. The playground of an `<Axes>` is the default of its component, so
 * an example of that component with a title such as `Default` must name what
 * it shows.
 */
export function redundantExamples(
	source: string,
	api: readonly ComponentApi[],
): RedundantExample[] {
	const sf = ts.createSourceFile(
		'demo.tsx',
		source,
		ts.ScriptTarget.Latest,
		true,
		ts.ScriptKind.TSX,
	)

	const declarations = declarationsOf(sf)

	// What each `<Axes>` covers. An example must show more than any one of them.
	const coverage: Set<string>[] = []

	// The components that an `<Axes>` documents. Each has a playground.
	const documented = new Set<string>()

	const examples: ts.JsxElement[] = []

	const visit = (node: ts.Node) => {
		if (isTag(node, 'Axes', sf)) {
			const covered = new Set<string>()

			coverage.push(covered)

			const of = attributeOf(node, 'of', sf)

			const component = of && ts.isStringLiteralLike(of) && api.find((c) => c.name === of.text)

			if (component) {
				covered.add(component.name)

				documented.add(component.name)

				for (const axis of axesOf(component, stringsOf(attributeOf(node, 'omit', sf))))
					covered.add(`${component.name}.${axis.name}`)
			}

			const render = attributeOf(node, 'render', sf)

			if (render) settingsIn(render, sf, declarations, covered)
		}

		if (ts.isJsxElement(node) && isTag(node.openingElement, 'Example', sf)) examples.push(node)

		ts.forEachChild(node, visit)
	}

	visit(sf)

	const shownBy = examples.map((example) => {
		const shown = new Set<string>()

		for (const child of example.children) settingsIn(child, sf, declarations, shown)

		// The frame slots of an example, such as a stepper in `actions`, show too.
		for (const slot of FRAME_SLOTS) {
			const content = attributeOf(example.openingElement, slot, sf)

			if (content) settingsIn(content, sf, declarations, shown)
		}

		return shown
	})

	const titleOf = (example: ts.JsxElement) => {
		const title = attributeOf(example.openingElement, 'title', sf)

		return title && ts.isStringLiteralLike(title) ? title.text : '(untitled)'
	}

	const found: RedundantExample[] = []

	examples.forEach((example, index) => {
		const shown = shownBy[index] as Set<string>

		const title = titleOf(example)

		const earlier = examples.findIndex(
			(_, other) => other < index && sameSet(shown, shownBy[other] as Set<string>),
		)

		let reason: string | null = null

		// A literal value counts between examples, not against the axes: the axes
		// show each literal value of an axis.
		const structure = [...shown].filter((setting) => !setting.includes('='))

		if (coverage.some((covered) => structure.every((setting) => covered.has(setting))))
			reason = 'the axes show it'
		else if (earlier !== -1)
			reason = `"${titleOf(examples[earlier] as ts.JsxElement)}" shows the same`
		else if (GENERIC_TITLES.test(title) && [...shown].some((setting) => documented.has(setting)))
			reason = 'the playground is the default; name what the example shows'

		if (reason)
			found.push({
				title,
				reason,
				line: sf.getLineAndCharacterOfPosition(example.getStart(sf)).line + 1,
			})
	})

	return found
}

/** Whether two sets hold the same members. */
function sameSet(a: ReadonlySet<string>, b: ReadonlySet<string>): boolean {
	return a.size === b.size && [...a].every((member) => b.has(member))
}
