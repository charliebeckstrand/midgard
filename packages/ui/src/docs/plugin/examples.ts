import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import { type ESTree, normalizePath, Visitor } from 'vite'
import { DEFAULT_LANG, DEFAULT_THEME } from '../../components/code/code-shiki.ts'
import {
	highlightShiki,
	type ShikiHighlight,
} from '../../components/code/code-shiki-highlighter.ts'
import { humanize } from '../kit/humanize.ts'

/** The code of an example: the source of its file, and the markup that `CodeBlock` paints. */
export type ExampleCode = {
	code: string
	/**
	 * The highlight of `code` for `primeCodeBlock`, with the language and the
	 * theme of `CodeBlock`: the markup, and the background and the type of the theme.
	 */
	highlight: ShikiHighlight
	/**
	 * For a playground, where the props go as attributes: the index in `code`,
	 * and the white space that went before the spread in the source.
	 */
	spread?: { index: number; separator: string }
}

/** What the plugin adds to the default export of an example module. */
export type ExampleMeta = {
	/** The title of the example, from the file name: `with-icon.tsx` gives `With icon`. */
	title: string
	/** For a playground, the name of the component that takes the props. */
	component?: string
	/** Loads the code of the example, from the code module of its folder. */
	code: () => Promise<ExampleCode>
}

/** Parses TSX, as the `parse` of a plugin context does. */
type Parse = (code: string, options: { lang: 'tsx' }) => ESTree.Program

/**
 * The public id of the code module of a folder in `pages`. The module holds
 * the code of each example in the folder, so a page or a tab loads one code
 * module for all of its examples.
 */
export const CODE = 'virtual:docs/code/'

/** The public id of the code module of the folder of the example at `file` in `pages`. */
export function codeIdOf(pages: string, file: string): string {
	return CODE + normalizePath(path.relative(pages, path.dirname(file)))
}

/** The key of the example at `file` in the code module of its folder: the name of the file. */
function codeKeyOf(file: string): string {
	return path.basename(file, '.tsx')
}

/** An example module in `pages/`: a TSX file that is not the index of a page or a tab. */
export const EXAMPLE = /(?<!\/index)\.tsx$/

// The file name of the playground of a page.
const PLAYGROUND = 'playground'

type Example = {
	/** The name of the default export. */
	name: string
	/** The `{...props}` spread of a playground. `start` is the start of the white space before it. */
	spread?: { start: number; end: number; separator: string; component: string }
}

/**
 * Reads an example module: the name of its default export and, for a
 * playground, the one `{...props}` spread of its props. A module with no
 * default export is not an example, such as the data that examples share. It
 * throws when the default export is not a named function, and when a
 * playground does not spread its props exactly once.
 */
function readExample(parse: Parse, code: string, file: string): Example | undefined {
	const program = parse(code, { lang: 'tsx' })

	const exported = program.body.find((node) => node.type === 'ExportDefaultDeclaration')

	if (!exported) return undefined

	const { declaration } = exported

	if (declaration.type !== 'FunctionDeclaration' || !declaration.id) {
		throw new Error(`${file}: an example exports a named function as its default export`)
	}

	const name = declaration.id.name

	if (path.basename(file, '.tsx') !== PLAYGROUND) return { name }

	const [props] = declaration.params

	const spreads: NonNullable<Example['spread']>[] = []

	new Visitor({
		JSXOpeningElement(element) {
			for (const attribute of element.attributes) {
				if (
					attribute.type === 'JSXSpreadAttribute' &&
					attribute.argument.type === 'Identifier' &&
					props?.type === 'Identifier' &&
					attribute.argument.name === props.name
				) {
					const start = code.slice(0, attribute.start).trimEnd().length

					spreads.push({
						start,
						end: attribute.end,
						separator: code.slice(start, attribute.start),
						component: code.slice(element.name.start, element.name.end),
					})
				}
			}
		},
	}).visit(program)

	const [spread] = spreads

	if (spreads.length !== 1 || !spread) {
		throw new Error(
			`${file}: a playground spreads its props parameter onto one element exactly once ({...props}), and this one spreads it ${spreads.length} times`,
		)
	}

	return { name, spread }
}

/**
 * Adds the {@link ExampleMeta} of an example module to its default export.
 * The code goes at the end of the module and moves no other code, so the
 * transform keeps the source map as it is. It gives no code for a module that
 * is not an example.
 */
export function attachMeta(
	parse: Parse,
	code: string,
	file: string,
	pages: string,
): string | undefined {
	const example = readExample(parse, code, file)

	if (!example) return undefined

	const { name, spread } = example

	const meta = [
		`title: ${JSON.stringify(humanize(path.basename(file, '.tsx')))}`,
		...(spread ? [`component: ${JSON.stringify(spread.component)}`] : []),
		`code: () => import(${JSON.stringify(codeIdOf(pages, file))}).then((module) => module.default[${JSON.stringify(codeKeyOf(file))}])`,
	]

	return `${code}\nObject.assign(${name}, { ${meta.join(', ')} })\n`
}

/**
 * Reads the code of the example at `file`. The source of a playground has no
 * `{...props}` spread, and `spread` gives the place of it. The markup is the
 * highlight of the code with no props, so a playground at its defaults shows
 * its code highlighted at once too. It gives nothing for a module that is not
 * an example.
 */
async function readCode(parse: Parse, file: string): Promise<ExampleCode | undefined> {
	const source = await readFile(file, 'utf8')

	const example = readExample(parse, source, file)

	if (!example) return undefined

	const { spread } = example

	const code = spread ? source.slice(0, spread.start) + source.slice(spread.end) : source

	const highlight = await highlightShiki(code.trim(), DEFAULT_LANG, DEFAULT_THEME)

	return {
		code,
		highlight,
		...(spread && { spread: { index: spread.start, separator: spread.separator } }),
	}
}

/** The {@link EXAMPLE} modules of `folder`. */
export async function exampleFiles(folder: string): Promise<string[]> {
	const entries = await readdir(folder, { withFileTypes: true })

	return entries
		.filter((entry) => entry.isFile())
		.map((entry) => path.join(folder, entry.name))
		.filter((file) => EXAMPLE.test(file))
		.toSorted()
}

/** Loads the code module of a folder: the code of each example in `files`, by {@link codeKeyOf}. */
export async function loadCodes(
	parse: Parse,
	files: readonly string[],
): Promise<Record<string, ExampleCode>> {
	const codes = await Promise.all(
		files.map(async (file) => [file, await readCode(parse, file)] as const),
	)

	return Object.fromEntries(
		codes.flatMap(([file, code]) => (code ? [[codeKeyOf(file), code]] : [])),
	)
}
