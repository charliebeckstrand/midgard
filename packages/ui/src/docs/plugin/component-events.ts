import path from 'node:path'
import { prefixRegex } from '@rolldown/pluginutils'
import { type ESTree, type Plugin, Visitor } from 'vite'

/** Parses TSX, as the `parse` of a plugin context does. */
type Parse = (code: string, options: { lang: 'tsx' }) => ESTree.Program

/** A prop that holds a callback: `on`, then a capital letter. */
const CALLBACK = /^on[A-Z]/

/** The local name of `componentEvent` in a page module. */
const WRAP = '__componentEvent'

/**
 * The Vite plugin that sends each callback that the JSX of `pages/` gives to a
 * component through the Event log (`debug/event-log/component-events.ts`).
 * The plugin reads the name of the component from the tag in the source, so a
 * line names the component in the minified build too.
 */
export function componentEvents(): Plugin {
	const docs = path.resolve(import.meta.dirname, '..')

	const pages = path.join(docs, 'pages')

	const module = JSON.stringify(path.join(docs, 'debug', 'event-log', 'component-events.ts'))

	return {
		name: 'vite-plugin-docs-component-events',
		// The transform reads the JSX of a page, so it runs before the JSX transform.
		enforce: 'pre',
		transform: {
			filter: { id: { include: prefixRegex(`${pages}/`), exclude: /(?<!\.tsx)$/ } },
			handler(code) {
				const labeled = labelCallbacks(this.parse.bind(this), code)

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
 * `componentEvent`, with the tag and the prop as the label:
 * `<Tabs onValueChange={f}>` gives
 * `<Tabs onValueChange={__componentEvent("Tabs onValueChange", f)}>`. A host
 * element, such as `<div>`, stays as it is, because the input listeners of the
 * log record the DOM events. It gives nothing for code with no such prop.
 */
export function labelCallbacks(parse: Parse, code: string): string | undefined {
	// Each edit inserts text and removes none, so the edits go from the end of
	// the code to the start, and an edit inside the value of another prop keeps its place.
	const inserts: { at: number; text: string }[] = []

	new Visitor({
		JSXOpeningElement({ name, attributes }) {
			const component =
				name.type === 'JSXMemberExpression' ||
				(name.type === 'JSXIdentifier' && /^[A-Z]/.test(name.name))

			if (!component) return

			const tag = code.slice(name.start, name.end)

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

				const label = JSON.stringify(`${tag} ${attribute.name.name}`)

				inserts.push({ at: start, text: `${WRAP}(${label}, ` }, { at: end, text: ')' })
			}
		},
	}).visit(parse(code, { lang: 'tsx' }))

	if (inserts.length === 0) return undefined

	let labeled = code

	for (const { at, text } of inserts.toSorted((a, b) => b.at - a.at)) {
		labeled = labeled.slice(0, at) + text + labeled.slice(at)
	}

	return labeled
}
