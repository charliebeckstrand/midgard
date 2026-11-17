/**
 * The message loader of the Next build of each app. The `turbopack.rules` of
 * `appConfig` in `auth` run it on each module that defines messages and on
 * each translation in a `lang` folder. It precompiles each message to the
 * syntax tree of FormatJS, so that the app bundle can replace the message
 * parser with its `no-parser` entry (the `turbopack.resolveAlias` of
 * `appConfig`).
 *
 * In a module, the loader changes each descriptor of a `defineMessage` or a
 * `defineMessages` call: the `defaultMessage` becomes its syntax tree, and the
 * `description` goes away, because only the translators read it. In a
 * translation, each message becomes its syntax tree.
 *
 * The source, the tests, and the docs app keep the message text and the
 * parser. FormatJS takes a message as text or as a syntax tree, and the two
 * give the same output.
 */

import { type MessageFormatElement, parse } from '@formatjs/icu-messageformat-parser'
import { parseAst } from 'vite'

/** The part of the loader context of Turbopack that the loader reads. */
type LoaderContext = { readonly resourcePath: string }

type Node = { readonly type: string; readonly start: number; readonly end: number }

type Property = Node & {
	readonly key: Node & { readonly name?: string; readonly value?: unknown }
	readonly value: Node
	readonly computed: boolean
}

type Edit = { readonly start: number; readonly end: number; readonly text: string }

// The names of the calls that define messages. `pnpm intl` finds them by the
// same names (`intl-messages.ts`).
const DEFINE_CALLS: ReadonlySet<string> = new Set(['defineMessage', 'defineMessages'])

// The syntax tree of a message, as JSON. A message that does not parse stops
// the build, with the name of its module.
function compile(message: string, where: string): string {
	let ast: MessageFormatElement[]

	try {
		ast = parse(message)
	} catch (error) {
		throw new Error(`${where}: the message "${message}" does not parse`, { cause: error })
	}

	return JSON.stringify(ast)
}

/**
 * A translation, `{ id: message }` as JSON, with each message as its syntax
 * tree.
 */
export function compileTranslation(source: string, file: string): string {
	const messages = JSON.parse(source) as Record<string, string>

	const compiled = Object.entries(messages).map(
		([id, message]) => `${JSON.stringify(id)}:${compile(message, `${file} ${id}`)}`,
	)

	return `{${compiled.join(',')}}`
}

function isNode(value: unknown): value is Node {
	return typeof value === 'object' && value !== null && typeof (value as Node).type === 'string'
}

// The children of a node, in source order.
function children(node: Node): Node[] {
	const found: Node[] = []

	for (const value of Object.values(node)) {
		if (Array.isArray(value)) {
			for (const item of value) if (isNode(item)) found.push(item)
		} else if (isNode(value)) {
			found.push(value)
		}
	}

	return found
}

// The expression inside the type wrappers of TypeScript, such as `x as const`.
function unwrap(node: Node): Node {
	let current = node

	while (
		current.type === 'TSAsExpression' ||
		current.type === 'TSSatisfiesExpression' ||
		current.type === 'TSNonNullExpression' ||
		current.type === 'ParenthesizedExpression'
	) {
		current = (current as Node & { readonly expression: Node }).expression
	}

	return current
}

function properties(object: Node): Property[] {
	return (object as Node & { readonly properties: readonly Node[] }).properties.filter(
		(property): property is Property => property.type === 'Property',
	)
}

function keyName(property: Property): string | undefined {
	if (property.computed) return undefined

	const { key } = property

	if (key.type === 'Identifier') return key.name

	return typeof key.value === 'string' ? key.value : undefined
}

// The text of a string literal, or of a template literal with no
// substitution. Any other expression gives `undefined`.
function literalText(node: Node): string | undefined {
	if (node.type === 'Literal') {
		const { value } = node as Node & { readonly value: unknown }

		return typeof value === 'string' ? value : undefined
	}

	if (node.type === 'TemplateLiteral') {
		const { expressions, quasis } = node as Node & {
			readonly expressions: readonly Node[]
			readonly quasis: readonly { readonly value: { readonly cooked: string } }[]
		}

		return expressions.length === 0 ? quasis[0]?.value.cooked : undefined
	}

	return undefined
}

// The end of `property` with the comma after it, so that its removal leaves
// a valid object.
function endWithComma(source: string, property: Property): number {
	let index = property.end

	while (/\s/.test(source[index] ?? '')) index++

	return source[index] === ',' ? index + 1 : property.end
}

// The place of `node` in `file`, as `file:line`.
function place(source: string, node: Node, file: string): string {
	return `${file}:${source.slice(0, node.start).split('\n').length}`
}

// The edits of one descriptor. A descriptor whose `defaultMessage` is not a
// literal stops the build: the parser is not in the bundle, so the text of
// such a message cannot show.
function descriptorEdits(source: string, descriptor: Node, file: string): Edit[] {
	const object = unwrap(descriptor)

	if (object.type !== 'ObjectExpression') {
		throw new Error(`${place(source, object, file)}: a message descriptor is not an object literal`)
	}

	const edits: Edit[] = []

	for (const property of properties(object)) {
		const name = keyName(property)

		if (name === 'description') {
			edits.push({ start: property.start, end: endWithComma(source, property), text: '' })
		} else if (name === 'defaultMessage') {
			const text = literalText(property.value)

			if (text === undefined) {
				throw new Error(
					`${place(source, property, file)}: a defaultMessage is not a string literal`,
				)
			}

			edits.push({
				start: property.value.start,
				end: property.value.end,
				text: compile(text, place(source, property, file)),
			})
		}
	}

	return edits
}

// The edits of a `defineMessage` or a `defineMessages` call.
function callEdits(source: string, call: Node, file: string): Edit[] {
	const { callee, arguments: args } = call as Node & {
		readonly callee: Node & { readonly name?: string }
		readonly arguments: readonly Node[]
	}

	if (callee.type !== 'Identifier' || !DEFINE_CALLS.has(callee.name ?? '')) return []

	const [argument] = args

	if (!argument) return []

	if (callee.name === 'defineMessage') return descriptorEdits(source, argument, file)

	const set = unwrap(argument)

	if (set.type !== 'ObjectExpression') {
		throw new Error(
			`${place(source, set, file)}: the messages of defineMessages are not an object literal`,
		)
	}

	return properties(set).flatMap((property) => descriptorEdits(source, property.value, file))
}

/**
 * A TypeScript module with each descriptor of its `defineMessage` and
 * `defineMessages` calls precompiled. A module with no such call stays the
 * same.
 */
export function compileDescriptors(source: string, file: string): string {
	if (!/\bdefineMessages?\b/.test(source)) return source

	const program = parseAst(source, {
		lang: file.endsWith('.tsx') ? 'tsx' : 'ts',
	}) as unknown as Node

	const edits: Edit[] = []

	const pending: Node[] = [program]

	for (let node = pending.pop(); node; node = pending.pop()) {
		if (node.type === 'CallExpression') edits.push(...callEdits(source, node, file))

		pending.push(...children(node))
	}

	edits.sort((a, b) => b.start - a.start)

	let output = source

	for (const { start, end, text } of edits) {
		output = output.slice(0, start) + text + output.slice(end)
	}

	return output
}

/**
 * The loader: a translation (`.json`) or a TypeScript module, with each
 * message precompiled.
 */
export default function intlLoader(this: LoaderContext, source: string): string {
	const file = this.resourcePath

	return file.endsWith('.json')
		? compileTranslation(source, file)
		: compileDescriptors(source, file)
}
