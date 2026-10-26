import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { type ESTree, Visitor } from 'vite'
import type { CatalogEntry } from '../../../scripts/intl-catalog.ts'
import { getOrCompute } from '../../utilities/get-or-compute.ts'
import { buildComponentField, buildFields, type Field, type Free } from '../kit/fields.ts'
import { humanize, isWord } from '../kit/humanize.ts'
import { formatValue, toPropId } from '../kit/names.ts'
import type { BarrelApi, Literal } from './api.ts'
import { type Parser, readExample } from './examples.ts'
import { findRouteFiles } from './pages.ts'

/** Reads the API data of the barrel `src/<barrel>`, as an `ApiExtractor` does. */
export type Extract = (barrel: string) => Promise<BarrelApi>

/** The start of the id of a virtual module of API data, such as `virtual:docs/api/components/button`. */
const API_MODULE = 'virtual:docs/api/'

/** A value that a `<Playground>` attribute gives in the source. */
type Data = Literal | readonly Data[] | { readonly [key: string]: Data }

/** What a `<Playground>` of a page gives its fields. */
type PlaygroundUse = {
	/** The barrel of the API data, such as `components/button`. */
	barrel: string
	/** The component of each playground module. */
	components: string[]
	omit: string[]
	values: { [prop: string]: Literal[] }
	free: Free
}

/** The module that `name` is imported from in `program`, or `undefined`. */
function findImport(program: ESTree.Program, name: string): string | undefined {
	for (const statement of program.body) {
		if (statement.type !== 'ImportDeclaration') continue

		if (statement.specifiers.some(({ local }) => local.name === name)) {
			return String(statement.source.value)
		}
	}

	return undefined
}

/** The initial value of the exported `const` named `name` in `program`, or `undefined`. */
function findConst(program: ESTree.Program, name: string): ESTree.Expression | undefined {
	for (const statement of program.body) {
		if (statement.type !== 'ExportNamedDeclaration') continue

		const { declaration } = statement

		if (declaration?.type !== 'VariableDeclaration') continue

		for (const { id, init } of declaration.declarations) {
			if (id.type === 'Identifier' && id.name === name && init) return init
		}
	}

	return undefined
}

/**
 * The data that `node` gives: a literal, an array, or an object of them. A name
 * gives the exported constant of the module that `file` imports it from, such
 * as a list of values that a playground and an example share. It throws for any
 * other node, because the extraction cannot read it.
 */
async function readData(
	parse: Parser,
	file: string,
	program: ESTree.Program,
	node: ESTree.Node,
): Promise<Data> {
	if (node.type === 'Literal' && node.value !== null && typeof node.value !== 'object') {
		return node.value as Literal
	}

	if (node.type === 'ArrayExpression') {
		return Promise.all(
			node.elements.map((element) => {
				if (!element || element.type === 'SpreadElement') {
					throw new Error(`${file}: a <Playground> list holds only values`)
				}

				return readData(parse, file, program, element)
			}),
		)
	}

	if (node.type === 'ObjectExpression') {
		const entries = await Promise.all(
			node.properties.map(async (property) => {
				if (property.type !== 'Property' || property.key.type !== 'Identifier') {
					throw new Error(`${file}: a <Playground> object holds only named values`)
				}

				return [property.key.name, await readData(parse, file, program, property.value)] as const
			}),
		)

		return Object.fromEntries(entries)
	}

	if (node.type === 'Identifier') {
		const source = findImport(program, node.name)

		if (source?.startsWith('.')) {
			const target = path.resolve(path.dirname(file), source)

			const imported = parse(await readFile(target, 'utf8'), { lang: 'tsx' })

			const init = findConst(imported, node.name)

			if (init) return readData(parse, target, imported, init)
		}
	}

	throw new Error(
		`${file}: a <Playground> attribute gives a literal, a list, an object, or an exported constant of a local module`,
	)
}

/** The playground modules that the `of` of a `<Playground>` names. */
function readModules(file: string, program: ESTree.Program, node: ESTree.Node): string[] {
	const names =
		node.type === 'ArrayExpression'
			? node.elements.map((element) => (element?.type === 'Identifier' ? element.name : ''))
			: [node.type === 'Identifier' ? node.name : '']

	return names.map((name) => {
		const source = name ? findImport(program, name) : undefined

		if (!source?.startsWith('.')) {
			throw new Error(`${file}: the of of a <Playground> names imported playground modules`)
		}

		return path.resolve(path.dirname(file), source)
	})
}

/** The component that the playground module `file` spreads its props onto. */
async function readComponent(parse: Parser, file: string): Promise<string> {
	const code = await readFile(file, 'utf8')

	const component = readExample(parse(code, { lang: 'tsx' }), code, file)?.spread?.component

	if (!component) throw new Error(`${file}: a playground module spreads its props onto a component`)

	return component
}

/** Each `<Playground>` of the page or the tab module `file`. */
async function readPlaygrounds(parse: Parser, file: string): Promise<PlaygroundUse[]> {
	const program = parse(await readFile(file, 'utf8'), { lang: 'tsx' })

	const elements: ESTree.JSXOpeningElement[] = []

	new Visitor({
		JSXOpeningElement(element) {
			if (element.name.type === 'JSXIdentifier' && element.name.name === 'Playground') {
				elements.push(element)
			}
		},
	}).visit(program)

	return Promise.all(
		elements.map(async (element) => {
			const attributes = new Map<string, ESTree.Node>()

			for (const attribute of element.attributes) {
				if (attribute.type !== 'JSXAttribute' || attribute.name.type !== 'JSXIdentifier') continue

				const { value } = attribute

				if (
					value?.type === 'JSXExpressionContainer' &&
					value.expression.type !== 'JSXEmptyExpression'
				) {
					attributes.set(attribute.name.name, value.expression)
				}
			}

			const api = attributes.get('api')

			const barrel = api?.type === 'Identifier' ? findImport(program, api.name) : undefined

			const of = attributes.get('of')

			if (!barrel?.startsWith(API_MODULE) || !of) {
				throw new Error(`${file}: a <Playground> takes an imported playground and its API data`)
			}

			const read = async (name: string) => {
				const node = attributes.get(name)

				return node ? readData(parse, file, program, node) : undefined
			}

			const [omit = [], values = {}, free = {}] = await Promise.all([
				read('omit'),
				read('values'),
				read('free'),
			])

			const components = await Promise.all(
				readModules(file, program, of).map((module) => readComponent(parse, module)),
			)

			return {
				barrel: barrel.slice(API_MODULE.length),
				components,
				omit: omit as string[],
				values: values as PlaygroundUse['values'],
				free: free as Free,
			}
		}),
	)
}

/**
 * A field that a page shows, and the component that the field sets. The field
 * that picks the component of a playground (`picker`) sets each of its
 * components.
 */
type Shown = { field: Field; component: string; picker?: boolean }

/**
 * Each field that a `<Playground>` of a page or a tab shows, from the same
 * builder that the playground renders with (`kit/fields.ts`).
 */
async function findFields(docs: string, parse: Parser, extract: Extract): Promise<Shown[]> {
	const files = findRouteFiles(docs)

	const uses = (await Promise.all(files.map((file) => readPlaygrounds(parse, file)))).flat()

	const apis = new Map<string, Promise<BarrelApi>>()

	const shown: Shown[] = []

	// One barrel at a time, because the extraction waits on one TypeScript server.
	for (const use of uses) {
		const api = await getOrCompute(apis, use.barrel, extract)

		for (const component of use.components) {
			const props = api[component]?.props

			if (!props) throw new Error(`docs: ${use.barrel} exports no component ${component}`)

			// The step only sets the default of a density field, which is no label.
			for (const field of buildFields(props, use.omit, use.values, use.free, 'md')) {
				shown.push({ field, component })
			}
		}

		if (use.components.length > 1) {
			const field = buildComponentField(use.components)

			for (const component of use.components) shown.push({ field, component, picker: true })
		}
	}

	return shown
}

/** The values of a field that get an option entry: each word, also in a value for each breakpoint. */
function wordValues(field: Field): string[] {
	if (field.kind !== 'choice') return []

	return field.values
		.flatMap((value) => (typeof value === 'object' ? Object.values(value) : [value]))
		.filter(isWord)
}

/**
 * The catalog entries of the fields of the playgrounds: the label of each
 * field, from the name of its prop, and each option of a field that is a
 * word, from its value. Each option of the field that picks the component of
 * a playground gets an entry too, such as "Dots" for `LoadingDots`. The entries come from the fields that each
 * `<Playground>` renders, so a field has an entry only when a page shows it. A
 * label and an option have no descriptor in the source.
 */
export async function fieldEntries(
	docs: string,
	parse: Parser,
	extract: Extract,
): Promise<Record<string, CatalogEntry>> {
	// The English text of each entry, and the components that show it, by message id.
	const entries = new Map<string, { text: string; note: string; components: Set<string> }>()

	const add = (id: string, text: string, note: string, component: string) =>
		getOrCompute(entries, id, () => ({ text, note, components: new Set<string>() })).components.add(
			component,
		)

	for (const { field, component, picker } of await findFields(docs, parse, extract)) {
		const { name } = field

		if (picker) {
			for (const value of wordValues(field)) {
				add(
					toPropId(name, value),
					formatValue(value),
					'An option of the field of a playground in the docs that picks the component to show. It shows one of',
					component,
				)
			}

			continue
		}

		add(
			toPropId(name),
			humanize(name),
			`The label of a field of a playground in the docs. The field sets the prop ${name} of`,
			component,
		)

		for (const value of wordValues(field)) {
			add(
				toPropId(name, value),
				formatValue(value),
				`An option of the ${humanize(name)} field of a playground in the docs. It sets the prop ${name} to '${value}' on`,
				component,
			)
		}
	}

	return Object.fromEntries(
		[...entries].map(([id, { text, note, components }]) => [
			id,
			{ defaultMessage: text, description: `${note} ${[...components].toSorted().join(', ')}.` },
		]),
	)
}
