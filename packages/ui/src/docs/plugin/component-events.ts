import path from 'node:path'
import { prefixRegex } from '@rolldown/pluginutils'
import { type ESTree, type Plugin, Visitor } from 'vite'

/** A prop that holds a callback: `on`, then a capital letter. */
const CALLBACK = /^on[A-Z]/

/** The local name of `componentEvent` in a page module. */
const WRAP = '__componentEvent'

/**
 * The Vite plugin that sends each callback that the JSX of `pages/` gives to a
 * component through the Event log (`debug/event-log/component-events.ts`).
 * The plugin reads the name of the component from the tag in the source, so a
 * line names the component in the minified build too. A tag that the page
 * imports from `src/modules` gives a module event, and any other tag gives a
 * component event.
 */
export function componentEvents(): Plugin {
	const docs = path.resolve(import.meta.dirname, '..')

	const pages = path.join(docs, 'pages')

	const modules = `${path.resolve(docs, '..', 'modules')}/`

	const module = JSON.stringify(path.join(docs, 'debug', 'event-log', 'component-events.ts'))

	return {
		name: 'vite-plugin-docs-component-events',
		// The transform reads the JSX of a page, so it runs before the JSX transform.
		enforce: 'pre',
		transform: {
			filter: { id: { include: prefixRegex(`${pages}/`), exclude: /(?<!\.tsx)$/ } },
			async handler(code, id) {
				const program = this.parse(code, { lang: 'tsx' })

				// The local names that the page imports from a module of `ui`, such as `Grid`.
				const fromModules = new Set<string>()

				for (const node of program.body) {
					if (node.type !== 'ImportDeclaration') continue

					const resolved = await this.resolve(node.source.value, id)

					if (!resolved?.id.startsWith(modules)) continue

					for (const specifier of node.specifiers) fromModules.add(specifier.local.name)
				}

				const labeled = labelCallbacks(program, code, fromModules)

				// The import goes on the first line, so the lines keep their numbers.
				return labeled === undefined
					? null
					: { code: `import { componentEvent as ${WRAP} } from ${module};${labeled}`, map: null }
			},
		},
	}
}

/**
 * The code with each `on…` prop of a component element wrapped in a call of
 * `componentEvent`, with the source, the tag, and the prop: `<Tabs onValueChange={f}>`
 * gives `<Tabs onValueChange={__componentEvent("component", "Tabs", "onValueChange", f)}>`.
 * The source is `module` when `fromModules` holds the first name of the tag. A
 * host element, such as `<div>`, stays as it is, because the input listeners
 * of the log record the DOM events. It gives nothing for code with no such prop.
 */
export function labelCallbacks(
	program: ESTree.Program,
	code: string,
	fromModules: ReadonlySet<string>,
): string | undefined {
	// Each edit inserts text and removes none, so the edits go from the end of
	// the code to the start, and an edit inside the value of another prop keeps its place.
	const inserts: { at: number; text: string }[] = []

	new Visitor({
		JSXOpeningElement({ name, attributes }) {
			const component =
				name.type === 'JSXMemberExpression' ||
				(name.type === 'JSXIdentifier' && /^[A-Z]/.test(name.name))

			if (!component) return

			const tag = JSON.stringify(code.slice(name.start, name.end))

			const source = JSON.stringify(fromModules.has(rootOf(name)) ? 'module' : 'component')

			for (const attribute of attributes) {
				if (
					attribute.type !== 'JSXAttribute' ||
					attribute.name.type !== 'JSXIdentifier' ||
					!CALLBACK.test(attribute.name.name) ||
					attribute.value?.type !== 'JSXExpressionContainer' ||
					attribute.value.expression.type === 'JSXEmptyExpression'
				)
					continue

				const { start, end } = attribute.value.expression

				const prop = JSON.stringify(attribute.name.name)

				inserts.push(
					{ at: start, text: `${WRAP}(${source}, ${tag}, ${prop}, ` },
					{ at: end, text: ')' },
				)
			}
		},
	}).visit(program)

	if (inserts.length === 0) return undefined

	let labeled = code

	for (const { at, text } of inserts.toSorted((a, b) => b.at - a.at)) {
		labeled = labeled.slice(0, at) + text + labeled.slice(at)
	}

	return labeled
}

/** The first name of a tag: `Grid` of `<Grid>`, and `Chart` of `<Chart.Line>`. */
function rootOf(name: ESTree.JSXElementName | ESTree.JSXMemberExpression['object']): string {
	if (name.type === 'JSXIdentifier') return name.name

	if (name.type === 'JSXMemberExpression') return rootOf(name.object)

	return ''
}
