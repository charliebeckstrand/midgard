import { createHash } from 'node:crypto'
import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import type { ESTree } from 'vite'
import {
	type CatalogEntry,
	formatPlainMessage,
	isTextName,
	parsePlainMessage,
} from '../../../scripts/intl-catalog.ts'
import type { Parser } from './examples.ts'

// The text of the demos: the literals in `pages/` that a reader sees. `pnpm
// intl` writes a catalog entry for each text, and the plugin builds a copy of
// each module of `pages/` for each translation, with each text in the language
// of the copy. The demo code thus stays plain, and "Show code" shows the text
// in the language of the reader.
//
// A literal is text by the rule of `intl-coverage-boundary.test.ts`: JSX text,
// a string as a JSX child, and the value of a text attribute or a text prop
// (`isTextName`). The same names make a property of an object text, such as
// the `label` of an option in a data module. A string that a conditional, a
// `??`, a `||`, a `&&`, or a `+` gives is text in the same places. A template
// with a value in it stays as written. Each other literal is code.

/** The start of the message id of a demo text. The rest is a hash of the English text. */
export const DEMO_ID = 'docs.demo.'

/** How a demo text is written in the source, which sets how a translation replaces it. */
type Form = 'jsx' | 'string' | 'attribute'

/** One demo text in a module: its place in the source and its English text. */
export type DemoText = {
	start: number
	end: number
	text: string
	form: Form
	/** The name of the attribute or the property, or `undefined` for JSX text. */
	name?: string
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

	if (node.type === 'TemplateLiteral') return node.expressions.length === 0 ? [node] : []

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
	/** Adds a string literal that is text. */
	add: (node: ESTree.Node, form: Form, name?: string) => void
	/** Adds JSX text. */
	addJsx: (node: ESTree.JSXText) => void
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

	const finder: Finder = {
		add(node, form, name) {
			const text = readString(node)

			if (LETTER.test(text)) {
				found.set(node.start, { start: node.start, end: node.end, text, form, name })
			}
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

			found.set(start, { start, end, text, form: 'jsx' })
		},
	}

	walk(program, (node) => {
		if (node.type === 'JSXElement' || node.type === 'JSXFragment') findChildren(node, finder)

		if (node.type === 'JSXAttribute') findAttribute(node, finder)

		if (node.type === 'Property') findProperty(node, finder)
	})

	return [...found.values()].toSorted((a, b) => a.start - b.start)
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

	if (quote === '`')
		return `\`${translation.replaceAll('\\', '\\\\').replaceAll('`', '\\`').replaceAll('${', '\\${')}\``

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
		const message = messages[toDemoId(found.text)]

		if (message === undefined) continue

		translated =
			translated.slice(0, found.start) +
			writeText(found, code, parsePlainMessage(message)) +
			translated.slice(found.end)
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

/**
 * The catalog entries of the demo texts: one for each text in `pages/`, keyed
 * by {@link toDemoId}, with the English text as the default. A text has no
 * descriptor in the source, so its description names the files that show it.
 */
export async function demoEntries(
	docs: string,
	parse: Parser,
): Promise<Record<string, CatalogEntry>> {
	const pages = path.join(docs, 'pages')

	const places = new Map<string, { text: string; files: Set<string>; names: Set<string> }>()

	for (const file of await findModules(pages)) {
		const code = await readFile(file, 'utf8')

		for (const found of findDemoText(
			parse(code, { lang: file.endsWith('.tsx') ? 'tsx' : 'ts' }),
			code,
			file,
		)) {
			const id = toDemoId(found.text)

			const place = places.get(id) ?? { text: found.text, files: new Set(), names: new Set() }

			places.set(id, place)

			place.files.add(path.relative(pages, file))

			if (found.name) place.names.add(found.name)
		}
	}

	return Object.fromEntries(
		[...places].map(([id, { text, files, names }]) => {
			const shown = [...files].slice(0, 3).join(', ')

			const more = files.size > 3 ? ` and ${files.size - 3} more` : ''

			const as = names.size > 0 ? ` as ${[...names].toSorted().join(', ')}` : ''

			return [
				id,
				{
					defaultMessage: formatPlainMessage(text),
					description: `Text of a demo in the docs${as}, in ${shown}${more}.`,
				},
			]
		}),
	)
}

/** The query of the copy of a module of `pages/` in a language, such as `?lang=es`. */
const LANG_QUERY = /\?lang=([a-z]{2,3})$/

/** The query that names the copy of a module in `language`. */
export function toLangQuery(language: string): string {
	return `?lang=${language}`
}

/** The file of a module id and the language of its copy, or `undefined` for the English module. */
export function readLangId(id: string): { file: string; language?: string } {
	const match = LANG_QUERY.exec(id)

	return match ? { file: id.slice(0, match.index), language: match[1] } : { file: id }
}

/**
 * `code` with each relative import of a module in `pages` pointed at the copy
 * of that module in `language`, so a copy imports the copies of the examples
 * and of the data that it uses. An import of the kit or of `ui` stays as it is.
 */
export function pointImports(
	program: ESTree.Program,
	code: string,
	file: string,
	pages: string,
	language: string,
): string {
	const sources = program.body.flatMap((statement) =>
		(statement.type === 'ImportDeclaration' ||
			statement.type === 'ExportNamedDeclaration' ||
			statement.type === 'ExportAllDeclaration') &&
		statement.source
			? [statement.source]
			: [],
	)

	let pointed = code

	for (const source of sources.toReversed()) {
		const value = String(source.value)

		if (!value.startsWith('.')) continue

		const target = path.resolve(path.dirname(file), value)

		if (!target.startsWith(`${pages}${path.sep}`)) continue

		pointed =
			pointed.slice(0, source.start) +
			JSON.stringify(`${value}${toLangQuery(language)}`) +
			pointed.slice(source.end)
	}

	return pointed
}

/**
 * `code` with its default export in the language of the reader: the page or
 * the tab module `file`, with each copy in `languages` ({@link toLangQuery}).
 * The default export of a page or a tab module is a function declaration with
 * a name, and the wrap keeps the function under that name. `kit` is the
 * module of `localize`.
 */
export function localizeRoute(
	program: ESTree.Program,
	code: string,
	file: string,
	languages: readonly string[],
	kit: string,
): string {
	const statement = program.body.find(
		(node): node is ESTree.ExportDefaultDeclaration => node.type === 'ExportDefaultDeclaration',
	)

	const declaration = statement?.declaration

	if (!statement || declaration?.type !== 'FunctionDeclaration' || !declaration.id) {
		throw new Error(`${file}: a page or a tab module exports a named function by default`)
	}

	const copies = languages.map(
		(language) =>
			`${language}: () => import(${JSON.stringify(`./${path.basename(file)}${toLangQuery(language)}`)})`,
	)

	return [
		code.slice(0, statement.start),
		code.slice(declaration.start),
		`\nimport { localize as __localize } from ${JSON.stringify(kit)}`,
		`\nexport default __localize(${declaration.id.name}, { ${copies.join(', ')} })\n`,
	].join('')
}
