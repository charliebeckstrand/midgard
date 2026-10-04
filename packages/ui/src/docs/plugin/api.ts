import path from 'node:path'
import type { Checker, Program, Symbol as TsSymbol, Type } from 'typescript/unstable/sync'
import { densitySteps, isDensityStep } from '../../core/density/steps.ts'

// The API data of the docs comes from the TypeScript 7 API, which is
// `typescript/unstable/sync`. Its name says that a minor release can change
// it, so the version of `typescript` is exact, and this file is the one
// file that uses the API.

/** A value of a prop whose type is a union of literals. */
export type Literal = string | number | boolean

/** One prop of a component, as the API table and the playground read it. */
export type PropApi = {
	name: string
	/** The type as TypeScript writes it, without `undefined`. A type that `values` gives has none. */
	type?: string
	/** Each member of a type that is a union of literals, in the order of {@link compareLiterals}. */
	values?: Literal[]
	required?: true
	/** The text of the `@defaultValue` tag. */
	default?: string
	/** Markdown. */
	description?: string
	/** The text of the `@deprecated` tag, which can be empty. */
	deprecated?: string
}

/** One component of a barrel. */
export type ComponentApi = {
	name: string
	/** Markdown. */
	description?: string
	/** The props that `ui` declares, in name order. A prop that only a package declares, such as a DOM attribute, is not in the list. */
	props: PropApi[]
	/** The tags whose HTML attributes the component also takes. An empty tag stands for any element. */
	elements?: string[]
}

/** The components of one barrel, by name, in name order. */
export type BarrelApi = { readonly [component: string]: ComponentApi }

/** The extractor of the plugin. The TypeScript server starts on the first {@link ApiExtractor.extract}. */
export type ApiExtractor = {
	/** Returns the API data of a barrel, such as `components/button`. */
	extract(barrel: string): Promise<BarrelApi>
	/** Makes the next extract read each source file again. */
	refresh(): void
	/** Stops the TypeScript server. A later extract starts it again. */
	close(): void
}

/**
 * The order of the values of a union: the steps of the size scale of `ui` in
 * scale order, then each other string in alphabetical order, then the numbers
 * from low to high, then `false` and `true`.
 */
export function compareLiterals(a: Literal, b: Literal): number {
	const byRank = rankOf(a) - rankOf(b)

	if (byRank !== 0) return byRank

	if (typeof a === 'string' && typeof b === 'string') {
		return isDensityStep(a) && isDensityStep(b)
			? densitySteps.indexOf(a) - densitySteps.indexOf(b)
			: a.localeCompare(b)
	}

	return Number(a) - Number(b)
}

function rankOf(value: Literal): number {
	if (typeof value === 'string') return isDensityStep(value) ? 0 : 1

	return typeof value === 'number' ? 2 : 3
}

const EVENT = /^on[A-Z]/

// An inline link of TSDoc: `{@link target}` or `{@link target | label}`.
const LINK = /\{@link\s+([^\s|}]+)\s*\|?\s*([^}]*)\}/g

// The class name of an element whose tag is not its lowercase name.
const TAGS: Readonly<Record<string, string>> = {
	Anchor: 'a',
	DList: 'dl',
	Heading: 'h1',
	Image: 'img',
	OList: 'ol',
	Paragraph: 'p',
	Quote: 'blockquote',
	TableCaption: 'caption',
	TableCell: 'td',
	TableCol: 'col',
	TableRow: 'tr',
	TableSection: 'tbody',
	UList: 'ul',
}

/**
 * Creates the extractor for the `ui` package at `root`. It reads the barrel
 * `src/<barrel>/index.ts` through the project of `root/tsconfig.json`.
 */
export function createApiExtractor(root: string): ApiExtractor {
	const config = path.join(root, 'tsconfig.json')

	let server: Promise<Server> | undefined

	// Whether a source file changed after the snapshot of the server.
	let stale = false

	return {
		async extract(barrel) {
			server ??= openServer(root, config)

			const current = await server

			if (stale) {
				stale = false

				current.refresh()
			}

			return current.reader().barrel(path.join(root, 'src', barrel, 'index.ts'))
		},
		refresh() {
			stale = server !== undefined
		},
		close() {
			server?.then((current) => current.close())

			server = undefined
		},
	}
}

type Ts = typeof import('typescript/unstable/sync')

type Server = { reader(): Reader; refresh(): void; close(): void }

/** Starts the TypeScript server, and opens the project of `config`. */
async function openServer(root: string, config: string): Promise<Server> {
	const ts = await import('typescript/unstable/sync')

	const api = new ts.API({ cwd: root })

	let snapshot = api.updateSnapshot({ openProjects: [config] })

	return {
		reader() {
			const project = snapshot.getProject(config)

			if (!project) throw new Error(`docs: TypeScript did not open ${config}`)

			return new Reader(ts, project.program, project.checker)
		},
		refresh() {
			const previous = snapshot

			snapshot = api.updateSnapshot({ fileChanges: { invalidateAll: true } })

			previous.dispose()
		},
		close() {
			api.close()
		},
	}
}

/** Reads the components and the props of a barrel in one snapshot. */
class Reader {
	// Each literal in single quotes, as the source writes it, and no `...` in a long type.
	private readonly format: number

	private readonly ts: Ts

	private readonly program: Program

	private readonly checker: Checker

	constructor(ts: Ts, program: Program, checker: Checker) {
		this.ts = ts

		this.program = program

		this.checker = checker

		const { NodeBuilderFlags } = ts

		this.format =
			NodeBuilderFlags.NoTruncation |
			NodeBuilderFlags.UseSingleQuotesForStringLiteralType |
			NodeBuilderFlags.UseAliasDefinedOutsideCurrentScope
	}

	barrel(file: string): BarrelApi {
		const source = this.program.getSourceFile(file)

		const module = source && this.checker.getSymbolAtLocation(source)

		if (!module) throw new Error(`docs: no barrel at ${file}`)

		const components = this.checker
			.getExportsOfModule(module)
			.flatMap((symbol) => this.component(symbol) ?? [])
			.toSorted(byName)

		return Object.fromEntries(components.map((component) => [component.name, component]))
	}

	/** The component of an export: a PascalCase value that takes props, or nothing. */
	private component(exported: TsSymbol): ComponentApi | undefined {
		const { checker, ts } = this

		if (!/^[A-Z]/.test(exported.name)) return undefined

		const symbol =
			exported.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(exported) : exported

		const type = symbol.flags & ts.SymbolFlags.Value ? checker.getTypeOfSymbol(symbol) : undefined

		const [signature] = type ? checker.getSignaturesOfType(type, ts.SignatureKind.Call) : []

		if (!signature) return undefined

		const props = checker.getParameterType(signature, 0)

		const members = props ? checker.getPropertiesOfType(props) : []

		// A prop that `ui` declares, also when a package declares it too, such as
		// the `color` of a button and of an HTML element.
		const own = members.filter((member) => !member.declarations.every(isPackage))

		const description = checker.getDocumentationCommentOfSymbol(symbol)

		const event = members.find((member) => EVENT.test(member.name) && !own.includes(member))

		const elements = this.elements(event)

		return {
			name: exported.name,
			...(description && { description }),
			props: own.flatMap((member) => this.prop(member) ?? []).toSorted(byName),
			...(elements.length > 0 && { elements }),
		}
	}

	private prop(symbol: TsSymbol): PropApi | undefined {
		const { checker, ts } = this

		const type = checker.getTypeOfSymbol(symbol)

		const defined = type && checker.getNonNullableType(type)

		// A `never` prop is the rest of a union arm that rules the key out.
		if (!type || !defined || defined.flags & ts.TypeFlags.Never) return undefined

		const tags = new Map(
			checker.getJsDocTagsOfSymbol(symbol).map((tag) => [tag.name, tag.text ?? '']),
		)

		const description = checker.getDocumentationCommentOfSymbol(symbol)

		const values = this.values(defined)

		const deprecated = tags.get('deprecated')

		const fallback = tags.get('defaultValue')

		return {
			name: symbol.name,
			...(values ? { values } : { type: this.text(type, defined) }),
			...(!(symbol.flags & ts.SymbolFlags.Optional) && { required: true }),
			...(fallback && { default: plainText(fallback) }),
			...(description && { description }),
			...(deprecated !== undefined && { deprecated }),
		}
	}

	/**
	 * The text of a prop type without `undefined`. An alias such as `ReactNode`
	 * holds `undefined` itself, and the type without it is a new union of each
	 * member, so the alias prints in its place. A `null` member stays.
	 */
	private text(type: Type, defined: Type): string {
		const { checker, ts } = this

		const text = checker.typeToString(
			type.getAliasSymbol() ? type : defined,
			undefined,
			this.format,
		)

		const nullable =
			type.isUnionType() && type.getTypes().some((member) => member.flags & ts.TypeFlags.Null)

		return nullable ? `${text} | null` : text
	}

	/**
	 * The members of a union of literals, in order. A union that a package
	 * names, such as the 300 languages of Shiki, keeps its name.
	 */
	private values(type: Type): Literal[] | undefined {
		if (!type.isUnionType() || type.getAliasSymbol()?.declarations.some(isPackage)) return undefined

		const values: Literal[] = []

		for (const member of type.getTypes()) {
			if (!member.isLiteralType() || typeof member.value === 'bigint') return undefined

			values.push(member.value)
		}

		return values.toSorted(compareLiterals)
	}

	/** The tags of the elements in the type of an inherited event prop, such as `MouseEventHandler<HTMLButtonElement>`. */
	private elements(event: TsSymbol | undefined): string[] {
		const type = event && this.checker.getTypeOfSymbol(event)

		const text = type ? this.checker.typeToString(type, undefined, this.format) : ''

		const names = new Set(
			Array.from(text.matchAll(/\bHTML(\w*)Element\b/g), ([, name = '']) => name),
		)

		return [...names].map((name) => TAGS[name] ?? name.toLowerCase()).toSorted()
	}
}

/** Whether a declaration is in a package, such as a DOM attribute from `@types/react`. */
/**
 * The order of the components and of the props. The plugin sorts them, so
 * the page does not sort them as it renders.
 */
function byName(a: { name: string }, b: { name: string }): number {
	return a.name.localeCompare(b.name)
}

function isPackage(declaration: { path: string }): boolean {
	return declaration.path.includes('/node_modules/')
}

/**
 * The text of a tag as the description of a symbol gives it: a link as its
 * label or its target, and one code span, such as `` `'start'` ``, without
 * the backticks.
 */
function plainText(text: string): string {
	const trimmed = text.replace(LINK, (_, target: string, label: string) => label || target).trim()

	return /^`[^`]+`$/.test(trimmed) ? trimmed.slice(1, -1) : trimmed
}
