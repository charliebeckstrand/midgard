import { createHash } from 'node:crypto'
import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import type { ESTree } from 'vite'
import {
	type CatalogEntry,
	formatPlainMessage,
	formatValueMessage,
	isTextName,
	type MessagePart,
	parsePlainMessage,
	parseValueMessage,
} from '../../../scripts/intl-catalog.ts'
import type { Parser } from './examples.ts'

// The text of the demos: the literals in `pages/` and in `data/` that a reader
// sees. `pnpm intl` writes a catalog entry for each text, and the plugin
// builds a copy of each module of `pages/` and of `data/` for each
// translation, with each text in the language of the copy (`copies.ts`). The
// demo code thus stays plain, and "Show code" shows the text in the language
// of the reader.
//
// A literal is text by the rule of `intl-coverage-boundary.test.ts`: JSX text,
// a string as a JSX child, and the value of a text attribute or a text prop
// (`isTextName`). The same names make a property of an object text, such as
// the `label` of an option in a data module. A string that a conditional, a
// `??`, a `||`, a `&&`, or a `+` gives is text in the same places.
//
// A template with values is text in the same places when each value is a name
// or a property, such as `` `${count} stops` `` or `` `Edit ${row.name}` ``. Its
// message holds an argument for each value, such as `{count} stops`, and the
// copy writes the template again from the translation. A template with
// another value, such as a call, stays as written.
//
// A word of the demo data, such as a status, is the value of a property in a
// call of `words` (`data/words.ts`). Its message id holds the domain and the
// key of the word, not a hash of the text, so the same English word can have
// another translation in another domain. Each other literal is code.

/** The start of the message id of a demo text. The rest is a hash of the English text. */
export const DEMO_ID = 'docs.demo.'

/**
 * The start of the message id of a word of the demo data. The rest is the
 * domain and the key of the word, such as `docs.data.order-status.pending`.
 */
export const DATA_ID = 'docs.data.'

/** The module of `words`, which gives the words of the demo data. */
const WORDS_MODULE = path.resolve(import.meta.dirname, '..', 'data', 'words.ts')

/** The form of a domain and of a key of a word, such as `order-status` and `inProgress`. */
const WORD_KEY = /^[A-Za-z][A-Za-z0-9-]*$/

/** How a demo text is written in the source, which sets how a translation replaces it. */
type Form = 'jsx' | 'string' | 'attribute'

/**
 * A value of a template: the name of its argument in the message, such as
 * `name` for `row.name`, and its source.
 */
type Value = { name: string; source: string }

/** One demo text in a module: its place in the source, its message id, and its English text. */
export type DemoText = {
	start: number
	end: number
	id: string
	/** The English text, or for a template the ICU message, such as `{count} stops`. */
	text: string
	form: Form
	/** The name of the attribute or the property, or `undefined` for JSX text and a word. */
	name?: string
	/** The values of a template, one for each argument of its message. */
	values?: readonly Value[]
}

/** A letter of any script. */
const LETTER = /\p{L}/u

/** The message id of the demo text `text`. The same text has one id in each module. */
export function toDemoId(text: string): string {
	return `${DEMO_ID}${createHash('sha256').update(text).digest('hex').slice(0, 12)}`
}

/**
 * The text of JSX text as React renders it. Each line loses the white space at
 * its ends, a line of only white space goes, and the lines join with a space.
 */
function readJsxText(raw: string): string {
	return raw
		.split(/\r?\n/)
		.map((line, index, lines) => {
			const start = index === 0 ? line : line.trimStart()

			return index === lines.length - 1 ? start : start.trimEnd()
		})
		.filter((line) => line.trim() !== '')
		.join(' ')
		.trim()
}

/** Each string literal that `node` gives as its value, through a conditional or an operator. */
function findStrings(node: ESTree.Node | null | undefined): ESTree.Node[] {
	if (!node) return []

	if (node.type === 'Literal') return typeof node.value === 'string' ? [node] : []

	if (node.type === 'TemplateLiteral') return [node]

	if (node.type === 'ConditionalExpression') {
		return [...findStrings(node.consequent), ...findStrings(node.alternate)]
	}

	if (node.type === 'LogicalExpression')
		return [...findStrings(node.left), ...findStrings(node.right)]

	if (node.type === 'BinaryExpression' && node.operator === '+') {
		return [...findStrings(node.left), ...findStrings(node.right)]
	}

	return []
}

/** The value of a string literal or a template with no value in it. */
function readString(node: ESTree.Node): string {
	if (node.type === 'Literal') return String(node.value)

	if (node.type === 'TemplateLiteral') return node.quasis[0]?.value.cooked ?? ''

	return ''
}

/** The name of the argument of a value of a template: the name, or the last property. */
function valueName(node: ESTree.Node): string | undefined {
	if (node.type === 'Identifier') return node.name

	if (
		node.type === 'MemberExpression' &&
		!node.computed &&
		node.property.type === 'Identifier' &&
		valueName(node.object) !== undefined
	) {
		return node.property.name
	}

	return undefined
}

/**
 * The value of each expression of `node`, or `undefined` when an expression is
 * not a name or a property, or when two expressions give the same name.
 */
function readValues(node: ESTree.TemplateLiteral, code: string): Value[] | undefined {
	const values: Value[] = []

	for (const expression of node.expressions) {
		const name = valueName(expression)

		if (name === undefined) return undefined

		const source = code.slice(expression.start, expression.end)

		if (values.some((value) => value.name === name && value.source !== source)) return undefined

		values.push({ name, source })
	}

	return values
}

/** The parts of the message of a template, with the argument of each value. */
function templateParts(node: ESTree.TemplateLiteral, values: readonly Value[]): MessagePart[] {
	return node.quasis.flatMap((quasi, index) => {
		const value = values[index]

		const text = quasi.value.cooked ?? ''

		return [...(text === '' ? [] : [text]), ...(value ? [{ name: value.name }] : [])]
	})
}

/** The name of a JSX attribute, such as `aria-label`. */
function attributeName(attribute: ESTree.JSXAttribute): string {
	const { name } = attribute

	return name.type === 'JSXIdentifier' ? name.name : `${name.namespace.name}:${name.name.name}`
}

/** The name of the key of a property, or `undefined` for a computed key. */
function propertyName(property: Extract<ESTree.Node, { type: 'Property' }>): string | undefined {
	if (property.computed) return undefined

	const { key } = property

	if (key.type === 'Identifier') return key.name

	return key.type === 'Literal' && typeof key.value === 'string' ? key.value : undefined
}

/** Finds the demo texts of one node of a module, by its kind. */
type Finder = {
	/** Adds a string literal or a template that is text. */
	add: (node: ESTree.Node, form: Form, name?: string) => void
	/** Adds JSX text. */
	addJsx: (node: ESTree.JSXText) => void
	/** Adds a word of the demo data, with its message id. */
	addWord: (node: Extract<ESTree.Node, { type: 'Literal' }>, id: string) => void
}

/** The demo texts that the children of a JSX element or a fragment hold. */
function findChildren(node: ESTree.JSXElement | ESTree.JSXFragment, finder: Finder): void {
	for (const child of node.children) {
		if (child.type === 'JSXText') finder.addJsx(child)

		if (child.type === 'JSXExpressionContainer' && child.expression.type !== 'JSXEmptyExpression') {
			for (const text of findStrings(child.expression)) finder.add(text, 'string')
		}
	}
}

/** The demo text of a text attribute. */
function findAttribute(attribute: ESTree.JSXAttribute, finder: Finder): void {
	const name = attributeName(attribute)

	const { value } = attribute

	if (!isTextName(name)) return

	if (value?.type === 'Literal') finder.add(value, 'attribute', name)

	if (value?.type === 'JSXExpressionContainer' && value.expression.type !== 'JSXEmptyExpression') {
		for (const text of findStrings(value.expression)) finder.add(text, 'string', name)
	}
}

/** The demo text of a text property of an object. */
function findProperty(property: Extract<ESTree.Node, { type: 'Property' }>, finder: Finder): void {
	const name = propertyName(property)

	if (name === undefined || !isTextName(name)) return

	for (const text of findStrings(property.value)) finder.add(text, 'string', name)
}

/** The name of `words` in the module `file`, or `undefined` when the module does not import it. */
function findWordsName(program: ESTree.Program, file: string): string | undefined {
	for (const statement of program.body) {
		if (
			statement.type !== 'ImportDeclaration' ||
			path.resolve(path.dirname(file), String(statement.source.value)) !== WORDS_MODULE
		) {
			continue
		}

		for (const specifier of statement.specifiers) {
			if (
				specifier.type === 'ImportSpecifier' &&
				specifier.imported.type === 'Identifier' &&
				specifier.imported.name === 'words'
			) {
				return specifier.local.name
			}
		}
	}

	return undefined
}

/**
 * The words of a call of `words`. It throws when the call does not give a
 * literal domain and an object of literal words, because `pnpm intl` reads
 * them from the source.
 */
function findWords(node: ESTree.CallExpression, file: string, finder: Finder): void {
	const [domain, words] = node.arguments

	const fail = (problem: string) =>
		new Error(
			`${file}: \`words\` takes a literal domain and an object of literal words: ${problem}`,
		)

	if (domain?.type !== 'Literal' || typeof domain.value !== 'string') {
		throw fail('the domain is not a string')
	}

	if (!WORD_KEY.test(domain.value)) throw fail(`the domain "${domain.value}" is not a key`)

	if (words?.type !== 'ObjectExpression') throw fail('the words are not an object')

	for (const property of words.properties) {
		const key = property.type === 'Property' ? propertyName(property) : undefined

		if (property.type !== 'Property' || key === undefined || !WORD_KEY.test(key)) {
			throw fail('a key is not a plain name')
		}

		const { value } = property

		if (value.type !== 'Literal' || typeof value.value !== 'string') {
			throw fail(`the word "${key}" is not a string`)
		}

		finder.addWord(value, `${DATA_ID}${domain.value}.${key}`)
	}
}

/** Calls `visit` on each node under `node`, in source order. */
function walk(node: unknown, visit: (node: ESTree.Node) => void): void {
	if (!node || typeof node !== 'object') return

	if (Array.isArray(node)) {
		for (const item of node) walk(item, visit)

		return
	}

	visit(node as ESTree.Node)

	for (const [key, value] of Object.entries(node)) {
		if (key !== 'parent' && value && typeof value === 'object') walk(value, visit)
	}
}

/**
 * Each demo text of `program`, in source order. It throws on a character
 * reference in JSX text, such as `&amp;`, because the source must hold the
 * character that the reader sees.
 */
export function findDemoText(program: ESTree.Program, code: string, file: string): DemoText[] {
	const found = new Map<number, DemoText>()

	const wordsName = findWordsName(program, file)

	const finder: Finder = {
		add(node, form, name) {
			// A word of the demo data is also the value of a property.
			if (found.has(node.start)) return

			const { start, end } = node

			if (node.type === 'TemplateLiteral' && node.expressions.length > 0) {
				const values = readValues(node, code)

				if (values === undefined) return

				const parts = templateParts(node, values)

				if (!parts.some((part) => typeof part === 'string' && LETTER.test(part))) return

				const text = formatValueMessage(parts)

				const unique = values.filter(
					(value, index) => values.findIndex((other) => other.name === value.name) === index,
				)

				found.set(start, { start, end, id: toDemoId(text), text, form, name, values: unique })

				return
			}

			const text = readString(node)

			if (LETTER.test(text)) found.set(start, { start, end, id: toDemoId(text), text, form, name })
		},
		addWord(node, id) {
			const { start, end } = node

			found.set(start, { start, end, id, text: String(node.value), form: 'string' })
		},
		addJsx(node) {
			const raw = code.slice(node.start, node.end)

			if (/&[#\w]+;/.test(raw)) {
				throw new Error(`${file}: JSX text holds a character reference. Write the character.`)
			}

			const text = readJsxText(raw)

			if (!LETTER.test(text)) return

			const start = node.start + (raw.length - raw.trimStart().length)

			const end = node.end - (raw.length - raw.trimEnd().length)

			found.set(start, { start, end, id: toDemoId(text), text, form: 'jsx' })
		},
	}

	walk(program, (node) => {
		if (
			node.type === 'CallExpression' &&
			node.callee.type === 'Identifier' &&
			node.callee.name === wordsName
		) {
			findWords(node, file, finder)
		}

		if (node.type === 'JSXElement' || node.type === 'JSXFragment') findChildren(node, finder)

		if (node.type === 'JSXAttribute') findAttribute(node, finder)

		if (node.type === 'Property') findProperty(node, finder)
	})

	return [...found.values()].toSorted((a, b) => a.start - b.start)
}

/** `text` as the text of a template literal. */
function escapeTemplate(text: string): string {
	return text.replaceAll('\\', '\\\\').replaceAll('`', '\\`').replaceAll('${', '\\${')
}

/** The template of `found` from its translated message, with each value of the source. */
function writeTemplate(found: DemoText, file: string, message: string): string {
	const sources = new Map(found.values?.map((value) => [value.name, value.source]))

	const parts = parseValueMessage(message).map((part) => {
		if (typeof part === 'string') return escapeTemplate(part)

		const source = sources.get(part.name)

		if (source === undefined) {
			throw new Error(`${file}: the translation of "${found.text}" has no value {${part.name}}`)
		}

		return `\${${source}}`
	})

	return `\`${parts.join('')}\``
}

/** A translation of a demo text as the source writes it in the place of `found`. */
function writeText(found: DemoText, code: string, translation: string): string {
	if (found.form === 'jsx') {
		return /[{}<>]/.test(translation) ? `{${JSON.stringify(translation)}}` : translation
	}

	if (found.form === 'attribute') {
		return translation.includes('"') ? `{${JSON.stringify(translation)}}` : `"${translation}"`
	}

	const quote = code[found.start] ?? "'"

	if (quote === '`') return `\`${escapeTemplate(translation)}\``

	const escaped = translation
		.replaceAll('\\', '\\\\')
		.replaceAll(quote, `\\${quote}`)
		.replaceAll('\n', '\\n')

	return `${quote}${escaped}${quote}`
}

/**
 * `code` with each demo text in the language of `messages`: the translated
 * messages of one language, by id. A text with no translation stays English.
 */
export function translateDemo(
	program: ESTree.Program,
	code: string,
	file: string,
	messages: Readonly<Record<string, string>>,
): string {
	let translated = code

	for (const found of findDemoText(program, code, file).toReversed()) {
		const message = messages[found.id]

		if (message === undefined) continue

		const written = found.values
			? writeTemplate(found, file, message)
			: writeText(found, code, parsePlainMessage(message))

		translated = translated.slice(0, found.start) + written + translated.slice(found.end)
	}

	return translated
}

/** The TypeScript modules under `folder`, at any depth, in path order. */
async function findModules(folder: string): Promise<string[]> {
	const entries = await readdir(folder, { recursive: true, withFileTypes: true })

	return entries
		.filter((entry) => entry.isFile() && /\.tsx?$/.test(entry.name))
		.map((entry) => path.join(entry.parentPath, entry.name))
		.toSorted()
}

/** The text of a demo in the places that show it, for the description of its entry. */
type Place = {
	found: DemoText
	files: Set<string>
	names: Set<string>
}

/** The sentence that names the arguments of a template for the translators. */
function describeValues(values: readonly Value[]): string {
	const names = values.map(({ name }) => `{${name}}`)

	if (names.length === 1) return `The argument ${names[0]} is a value from the code.`

	return `The arguments ${names.slice(0, -1).join(', ')} and ${names.at(-1)} are values from the code.`
}

/** The description of the catalog entry of a demo text, from its places. */
function describePlace({ found, files, names }: Place): string {
	const shown = [...files].slice(0, 3).join(', ')

	const more = files.size > 3 ? ` and ${files.size - 3} more` : ''

	const where = `in ${shown}${more}`

	if (found.id.startsWith(DATA_ID)) {
		const [domain, key] = found.id.slice(DATA_ID.length).split('.')

		return `A word of the demo data in the docs: the word for "${key}" in the domain "${domain}", ${where}.`
	}

	const as = names.size > 0 ? ` as ${[...names].toSorted().join(', ')}` : ''

	const values = found.values ? ` ${describeValues(found.values)}` : ''

	return `Text of a demo in the docs${as}, ${where}.${values}`
}

/**
 * The catalog entries of the demo texts: one for each text in `pages/` and in
 * `data/`, keyed by its message id, with the English text as the default. A
 * text has no descriptor in the source, so its description names the files
 * that show it. It throws when two words of the demo data have one id and
 * not the same text.
 */
export async function demoEntries(
	docs: string,
	parse: Parser,
): Promise<Record<string, CatalogEntry>> {
	const pages = path.join(docs, 'pages')

	const places = new Map<string, Place>()

	/** Adds the text `found` of the module `file` to its place. */
	function addPlace(found: DemoText, file: string): void {
		const place = places.get(found.id) ?? { found, files: new Set(), names: new Set() }

		if (place.found.text !== found.text) {
			throw new Error(`${file}: the word ${found.id} is "${place.found.text}" in another module`)
		}

		places.set(found.id, place)

		place.files.add(path.relative(file.startsWith(pages) ? pages : docs, file))

		if (found.name) place.names.add(found.name)
	}

	const files = [...(await findModules(pages)), ...(await findModules(path.join(docs, 'data')))]

	for (const file of files) {
		const code = await readFile(file, 'utf8')

		const program = parse(code, { lang: file.endsWith('.tsx') ? 'tsx' : 'ts' })

		for (const found of findDemoText(program, code, file)) addPlace(found, file)
	}

	return Object.fromEntries(
		[...places].map(([id, place]) => [
			id,
			{
				defaultMessage: place.found.values
					? place.found.text
					: formatPlainMessage(place.found.text),
				description: describePlace(place),
			},
		]),
	)
}
