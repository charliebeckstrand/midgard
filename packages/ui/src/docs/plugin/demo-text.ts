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
import { getOrCompute } from '../../utilities/get-or-compute.ts'
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
// `??`, a `||`, a `&&`, or a `+` gives is text in the same places. The string
// that an arrow function gives is text too, such as the value of a callback
// prop `clusterDetail`.
//
// The message of a check and the summary of a selection are text too, though
// their names are not text names: the value of `error` and of `summarize`, and
// the message that each check of `validate` or each value of `fieldErrors`
// gives. A check with a block body gives each string of a `return` and each
// string that it pushes on a list.
//
// A template with values is text in the same places when each value is a
// name, a property, or a call, such as `` `${count} stops` ``,
// `` `Edit ${row.name}` ``, or `` `${miles(span)} across` ``. Its message holds
// an argument for each value, such as `{count} stops` or `{miles} across`, and
// the copy writes the template again from the translation. A template with
// another value, such as a sum, stays as written.
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

/**
 * The folders of the modules with demo text under the folder `docs` of the
 * docs app: `pages/` and `data/`. Each module in them has a copy in each
 * language (`copies.ts`).
 */
export function demoFolders(docs: string): readonly string[] {
	return [path.join(docs, 'pages'), path.join(docs, 'data')]
}

/** The module of `words`, which gives the words of the demo data. */
const WORDS_MODULE = path.resolve(import.meta.dirname, '..', 'data', 'words.ts')

/** The form of a domain and of a key of a word, such as `order-status`, `inProgress`, and the code `37`. */
const WORD_KEY = /^[A-Za-z0-9][A-Za-z0-9-]*$/

/** How a demo text is written in the source, which sets how a translation replaces it. */
type Form = 'jsx' | 'string' | 'attribute'

/**
 * A value of a template: the name of its argument in the message, such as
 * `name` for `row.name`, and its source.
 */
type Value = { name: string; source: string }

/** One demo text in a module: its place in the source, its message id, and its English message. */
export type DemoText = {
	start: number
	end: number
	id: string
	/** The ICU message of the English text, such as `Save` or `{count} stops`. */
	message: string
	form: Form
	/** The name of the attribute or the property, or `undefined` for JSX text and a word. */
	name?: string
	/** The source of each value of a template, by the name of its argument. */
	values?: ReadonlyMap<string, string>
	/** The domain and the key of a word of the demo data. */
	word?: { domain: string; key: string }
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

/**
 * Each string literal that `node` gives as its value, through a conditional,
 * an operator, or a list.
 */
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

	if (node.type === 'ArrowFunctionExpression' && node.expression) return findStrings(node.body)

	if (node.type === 'ArrayExpression')
		return node.elements.flatMap((element) => findStrings(element))

	return []
}

/** The value of a string literal or a template with no value in it. */
function readString(node: ESTree.Node): string {
	if (node.type === 'Literal') return String(node.value)

	if (node.type === 'TemplateLiteral') return node.quasis[0]?.value.cooked ?? ''

	return ''
}

/**
 * The name of the argument of a value of a template: `count` for `count`, the
 * last property for a chain of properties, such as `name` for `row.name`, the
 * name of the list for an item, such as `levels` for `levels[value]`, and the
 * name of the function for a call, such as `miles` for `miles(span)`. Another
 * value has no name.
 */
function valueName(node: ESTree.Node): string | undefined {
	if (node.type === 'Identifier') return node.name

	if (node.type === 'CallExpression') return valueName(node.callee)

	if (node.type !== 'MemberExpression') return undefined

	if (node.computed) return valueName(node.object)

	if (node.property.type !== 'Identifier') return undefined

	return valueName(node.object) && node.property.name
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

		return [quasi.value.cooked ?? '', ...(value ? [{ name: value.name }] : [])]
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
	/** Adds a word of the demo data, with its domain and its key. */
	addWord: (node: Extract<ESTree.Node, { type: 'Literal' }>, domain: string, key: string) => void
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

/**
 * The demo texts that a component gives with `return`, such as the label of a
 * trigger. React renders the value of a component, so its text is text for a
 * person. A component is a function declaration whose name starts with a
 * capital letter. The returns of a function in the component are not part of
 * the component.
 */
function findReturns(node: ESTree.Function, finder: Finder): void {
	if (!node.id || !/^[A-Z]/.test(node.id.name)) return

	walk(node.body, (child) => {
		if (
			child.type === 'FunctionDeclaration' ||
			child.type === 'FunctionExpression' ||
			child.type === 'ArrowFunctionExpression'
		) {
			return false
		}

		if (child.type === 'ReturnStatement') {
			for (const text of findStrings(child.argument)) finder.add(text, 'string')
		}

		return undefined
	})
}

/**
 * The names of the props and the properties of `ui` that take a message but
 * are not text names: the message of a refused cell and the summary of a
 * selection.
 */
const MESSAGE_NAMES: ReadonlySet<string> = new Set(['error', 'summarize'])

/**
 * The names of the props and the properties that give a check or a message for
 * each field, such as `validate` of a Form.
 */
const MESSAGE_MAPS: ReadonlySet<string> = new Set(['fieldErrors', 'validate'])

/** Tells if the value of an attribute or a property named `name` is demo text. */
function carriesText(name: string): boolean {
	return isTextName(name) || MESSAGE_NAMES.has(name)
}

/**
 * The strings that a check gives: the value of an arrow function, or each
 * string of a `return` and of a `push` in a block body. A nested function is
 * not part of the check.
 */
function findCheckStrings(node: ESTree.Node): ESTree.Node[] {
	if (
		(node.type !== 'ArrowFunctionExpression' && node.type !== 'FunctionExpression') ||
		node.body?.type !== 'BlockStatement'
	) {
		return findStrings(node)
	}

	const strings: ESTree.Node[] = []

	walk(node.body, (child) => {
		if (
			child.type === 'FunctionDeclaration' ||
			child.type === 'FunctionExpression' ||
			child.type === 'ArrowFunctionExpression'
		) {
			return false
		}

		if (child.type === 'ReturnStatement') strings.push(...findStrings(child.argument))

		if (
			child.type === 'CallExpression' &&
			child.callee.type === 'MemberExpression' &&
			child.callee.property.type === 'Identifier' &&
			child.callee.property.name === 'push'
		) {
			for (const argument of child.arguments) strings.push(...findStrings(argument))
		}

		return undefined
	})

	return strings
}

/** The strings of the value of each field of a check map, such as `validate`. */
function findMapStrings(node: ESTree.Node): ESTree.Node[] {
	if (node.type !== 'ObjectExpression') return []

	return node.properties.flatMap((property) =>
		property.type === 'Property' ? findCheckStrings(property.value) : [],
	)
}

/** The demo text of a text attribute. */
function findAttribute(attribute: ESTree.JSXAttribute, finder: Finder): void {
	const name = attributeName(attribute)

	const { value } = attribute

	if (
		MESSAGE_MAPS.has(name) &&
		value?.type === 'JSXExpressionContainer' &&
		value.expression.type !== 'JSXEmptyExpression'
	) {
		for (const text of findMapStrings(value.expression)) finder.add(text, 'string', name)
	}

	if (!carriesText(name)) return

	if (value?.type === 'Literal') finder.add(value, 'attribute', name)

	if (value?.type === 'JSXExpressionContainer' && value.expression.type !== 'JSXEmptyExpression') {
		for (const text of findStrings(value.expression)) finder.add(text, 'string', name)
	}
}

/** The demo text of a text property of an object. */
function findProperty(property: Extract<ESTree.Node, { type: 'Property' }>, finder: Finder): void {
	const name = propertyName(property)

	if (name === undefined) return

	if (MESSAGE_MAPS.has(name)) {
		for (const text of findMapStrings(property.value)) finder.add(text, 'string', name)
	}

	if (!carriesText(name)) return

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
		if (property.type !== 'Property') throw fail('a property is a spread')

		const key = propertyName(property)

		if (key === undefined || !WORD_KEY.test(key)) throw fail('a key is not a plain name')

		const { value } = property

		if (value.type !== 'Literal' || typeof value.value !== 'string') {
			throw fail(`the word "${key}" is not a string`)
		}

		finder.addWord(value, domain.value, key)
	}
}

/** Calls `visit` on each node under `node`, in source order. */
function walk(node: unknown, visit: (node: ESTree.Node) => boolean | undefined): void {
	if (!node || typeof node !== 'object') return

	if (Array.isArray(node)) {
		for (const item of node) walk(item, visit)

		return
	}

	if (visit(node as ESTree.Node) === false) return

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

				const message = formatValueMessage(parts)

				const sources = new Map(values.map((value) => [value.name, value.source]))

				found.set(start, {
					start,
					end,
					id: toDemoId(message),
					message,
					form,
					name,
					values: sources,
				})

				return
			}

			const text = readString(node)

			if (LETTER.test(text)) {
				found.set(start, {
					start,
					end,
					id: toDemoId(text),
					message: formatPlainMessage(text),
					form,
					name,
				})
			}
		},
		addWord(node, domain, key) {
			const { start, end } = node

			found.set(start, {
				start,
				end,
				id: `${DATA_ID}${domain}.${key}`,
				message: formatPlainMessage(String(node.value)),
				form: 'string',
				word: { domain, key },
			})
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

			found.set(start, {
				start,
				end,
				id: toDemoId(text),
				message: formatPlainMessage(text),
				form: 'jsx',
			})
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

		if (node.type === 'FunctionDeclaration') findReturns(node, finder)

		return undefined
	})

	return [...found.values()].toSorted((a, b) => a.start - b.start)
}

/** `text` as the text of a template literal. */
function escapeTemplate(text: string): string {
	return text.replaceAll('\\', '\\\\').replaceAll('`', '\\`').replaceAll('${', '\\${')
}

/** The template of `found` from its translated message, with each value of the source. */
function writeTemplate(found: DemoText, file: string, message: string): string {
	const parts = parseValueMessage(message).map((part) => {
		if (typeof part === 'string') return escapeTemplate(part)

		const source = found.values?.get(part.name)

		if (source === undefined) {
			throw new Error(`${file}: the translation of "${found.message}" has no value {${part.name}}`)
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
function describeValues(values: ReadonlyMap<string, string>): string {
	const names = [...values.keys()].map((name) => `{${name}}`)

	if (names.length === 1) return `The argument ${names[0]} is a value from the code.`

	return `The arguments ${names.slice(0, -1).join(', ')} and ${names.at(-1)} are values from the code.`
}

/** The description of the catalog entry of a demo text, from its places. */
function describePlace({ found, files, names }: Place): string {
	const shown = [...files].slice(0, 3).join(', ')

	const more = files.size > 3 ? ` and ${files.size - 3} more` : ''

	const where = `in ${shown}${more}`

	if (found.word) {
		const { domain, key } = found.word

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
		const place = getOrCompute(places, found.id, () => ({
			found,
			files: new Set(),
			names: new Set(),
		}))

		if (place.found.message !== found.message) {
			throw new Error(`${file}: the word ${found.id} is "${place.found.message}" in another module`)
		}

		place.files.add(path.relative(file.startsWith(pages) ? pages : docs, file))

		if (found.name) place.names.add(found.name)
	}

	const files = (await Promise.all(demoFolders(docs).map(findModules))).flat()

	for (const file of files) {
		const code = await readFile(file, 'utf8')

		const program = parse(code, { lang: file.endsWith('.tsx') ? 'tsx' : 'ts' })

		for (const found of findDemoText(program, code, file)) addPlace(found, file)
	}

	return Object.fromEntries(
		[...places].map(([id, place]) => [
			id,
			{
				defaultMessage: place.found.message,
				description: describePlace(place),
			},
		]),
	)
}
