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
	/**
	 * The code of the `@defaultValue` tag, such as `'md'` or `2000`. A tag that is
	 * a sentence, such as "The step of the scope.", goes at the end of
	 * `description` instead.
	 */
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
	/**
	 * The props that `ui` declares, in name order, without the events. A prop
	 * that only a package declares, such as a DOM attribute, is not in the list.
	 */
	props: PropApi[]
	/** The props whose name is `on` and an uppercase letter, such as `onChange`, in name order. */
	events: PropApi[]
	/** The tags whose HTML attributes the component also takes. An empty tag stands for any element. */
	elements?: string[]
}

/** The components of one barrel, by name, in name order. */
export type BarrelApi = { readonly [component: string]: ComponentApi }

/** A change to a source file, as the `hotUpdate` hook of Vite gives it. */
type SourceChange = { file: string; type: 'create' | 'update' | 'delete' }

/** The extractor of the plugin. The TypeScript server starts on the first `extract`. */
type ApiExtractor = {
	/** Returns the API data of a barrel, such as `components/button`. */
	extract(barrel: string): Promise<BarrelApi>
	/** Makes the next extract read a file that changed. */
	refresh(change: SourceChange): void
	/** Stops the TypeScript server. A later extract starts it again. */
	close(): void
}

/**
 * The order of the values of a union: the steps of the size scale of `ui` in
 * scale order, then each other string in alphabetical order, then the numbers
 * from low to high, then `false` and `true`.
 */
function compareLiterals(a: Literal, b: Literal): number {
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

const CHANGES = { create: 'created', update: 'changed', delete: 'deleted' } as const

type Ts = typeof import('typescript/unstable/sync')

/**
 * Creates the extractor for the `ui` package at `root`. It reads the barrel
 * `src/<barrel>/index.ts` through the project of `tsconfig.api.json`, which
 * is the source of `ui` with no tests and no benchmarks.
 */
export function createApiExtractor(root: string): ApiExtractor {
	const config = path.join(import.meta.dirname, 'tsconfig.api.json')

	let server: Promise<{ ts: Ts; api: InstanceType<Ts['API']> }> | undefined

	let snapshot: ReturnType<InstanceType<Ts['API']>['updateSnapshot']> | undefined

	// The files that changed after the snapshot.
	let changes: Record<(typeof CHANGES)[keyof typeof CHANGES], string[]> | undefined

	// The tags of the DOM do not change, so each barrel reads the same map.
	const elementTags = new Map<string, string>()

	return {
		async extract(barrel) {
			server ??= import('typescript/unstable/sync').then((ts) => ({
				ts,
				api: new ts.API({ cwd: root }),
			}))

			const { ts, api } = await server

			if (!snapshot || changes) {
				const previous = snapshot

				snapshot = api.updateSnapshot(
					previous ? { fileChanges: changes } : { openProjects: [config] },
				)

				previous?.dispose()

				changes = undefined
			}

			const project = snapshot.getProject(config)

			if (!project) throw new Error(`docs: TypeScript did not open ${config}`)

			return readBarrel(
				ts,
				project.program,
				project.checker,
				path.join(root, 'src', barrel, 'index.ts'),
				elementTags,
			)
		},
		refresh({ file, type }) {
			if (!snapshot) return

			changes ??= { created: [], changed: [], deleted: [] }

			// Each environment of Vite gives the same change.
			const files = changes[CHANGES[type]]

			if (!files.includes(file)) files.push(file)
		},
		close() {
			void server?.then(({ api }) => api.close())

			server = undefined

			snapshot = undefined

			changes = undefined
		},
	}
}

/**
 * Reads the components, the props, and the events of the barrel at `file`.
 * The first call fills `elementTags`, the first tag of each element
 * interface, and each later call reads it.
 */
function readBarrel(
	ts: Ts,
	program: Program,
	checker: Checker,
	file: string,
	elementTags: Map<string, string>,
): BarrelApi {
	const { NodeBuilderFlags, SignatureKind, SymbolFlags, TypeFlags } = ts

	// Each literal in single quotes, as the source writes it, and no `...` in a long type.
	const format =
		NodeBuilderFlags.NoTruncation |
		NodeBuilderFlags.UseSingleQuotesForStringLiteralType |
		NodeBuilderFlags.UseAliasDefinedOutsideCurrentScope

	const source = program.getSourceFile(file)

	const module = source && checker.getSymbolAtLocation(source)

	if (!module) throw new Error(`docs: no barrel at ${file}`)

	/**
	 * The first tag of each element interface, from `HTMLElementTagNameMap`,
	 * such as `a` for `HTMLAnchorElement`.
	 */
	function tagsOf(): Map<string, string> {
		if (elementTags.size > 0) return elementTags

		const map = checker.resolveName('HTMLElementTagNameMap', SymbolFlags.Interface, source)

		for (const [tag, member] of map?.getMembers() ?? []) {
			const name = checker.getTypeOfSymbol(member)?.getSymbol()?.name

			if (name && !elementTags.has(name)) elementTags.set(name, String(tag))
		}

		return elementTags
	}

	/** The component of an export: a PascalCase value that takes props, or nothing. */
	function component(exported: TsSymbol): ComponentApi | undefined {
		if (!/^[A-Z]/.test(exported.name)) return undefined

		const symbol =
			exported.flags & SymbolFlags.Alias ? checker.getAliasedSymbol(exported) : exported

		const type = symbol.flags & SymbolFlags.Value ? checker.getTypeOfSymbol(symbol) : undefined

		const [signature] = type ? checker.getSignaturesOfType(type, SignatureKind.Call) : []

		if (!signature) return undefined

		const props = checker.getParameterType(signature, 0)

		const members = props ? checker.getPropertiesOfType(props) : []

		// A prop that `ui` declares, also when a package declares it too, such as
		// the `color` of a button and of an HTML element.
		const own = members.filter((member) => !member.declarations.every(isPackage))

		const description = checker.getDocumentationCommentOfSymbol(symbol)

		const event = members.find((member) => EVENT.test(member.name) && !own.includes(member))

		const elements = elementsOf(event)

		const apis = own.flatMap((member) => prop(member) ?? []).toSorted(byName)

		return {
			name: exported.name,
			...(description && { description }),
			props: apis.filter((api) => !EVENT.test(api.name)),
			events: apis.filter((api) => EVENT.test(api.name)),
			...(elements.length > 0 && { elements }),
		}
	}

	function prop(symbol: TsSymbol): PropApi | undefined {
		const type = checker.getTypeOfSymbol(symbol)

		const defined = type && checker.getNonNullableType(type)

		// A `never` prop is the rest of a union arm that rules the key out.
		if (!type || !defined || defined.flags & TypeFlags.Never) return undefined

		const tags = new Map(
			checker.getJsDocTagsOfSymbol(symbol).map((tag) => [tag.name, tag.text ?? '']),
		)

		const values = valuesOf(defined)

		const deprecated = tags.get('deprecated')

		const fallback = plainText(tags.get('defaultValue') ?? '')

		// A default that is a sentence, such as "The step of the scope.", is not code.
		const sentence = fallback.endsWith('.')

		const description = [
			checker.getDocumentationCommentOfSymbol(symbol),
			sentence && `Default: ${fallback}`,
		]
			.filter(Boolean)
			.join('\n\n')

		return {
			name: symbol.name,
			...(values ? { values } : { type: textOf(type, defined) }),
			...(!(symbol.flags & SymbolFlags.Optional) && { required: true }),
			...(fallback && !sentence && { default: fallback }),
			...(description && { description }),
			...(deprecated !== undefined && { deprecated }),
		}
	}

	/**
	 * The text of a prop type without `undefined`. An alias such as `ReactNode`
	 * holds `undefined` itself, and the type without it is a new union of each
	 * member, so the alias prints in its place. A `null` member stays.
	 */
	function textOf(type: Type, defined: Type): string {
		const text = checker.typeToString(type.getAliasSymbol() ? type : defined, undefined, format)

		const nullable =
			type.isUnionType() && type.getTypes().some((member) => member.flags & TypeFlags.Null)

		return nullable ? `${text} | null` : text
	}

	/**
	 * The members of a union of literals, in order. A union that a package
	 * names, such as the 300 languages of Shiki, keeps its name.
	 */
	function valuesOf(type: Type): Literal[] | undefined {
		if (!type.isUnionType() || type.getAliasSymbol()?.declarations.some(isPackage)) return undefined

		const values: Literal[] = []

		for (const member of type.getTypes()) {
			if (!member.isLiteralType() || typeof member.value === 'bigint') return undefined

			values.push(member.value)
		}

		return values.toSorted(compareLiterals)
	}

	/**
	 * The tags of the elements in the type of an inherited event prop, such as
	 * `MouseEventHandler<HTMLButtonElement>`. `HTMLElement` stands for any
	 * element, and gives an empty tag.
	 */
	function elementsOf(event: TsSymbol | undefined): string[] {
		const type = event && checker.getTypeOfSymbol(event)

		const text = type ? checker.typeToString(type, undefined, format) : ''

		const names = new Set(Array.from(text.matchAll(/\bHTML\w*Element\b/g), ([name]) => name))

		return [...names]
			.flatMap((name) => (name === 'HTMLElement' ? '' : (tagsOf().get(name) ?? [])))
			.toSorted()
	}

	const components = checker
		.getExportsOfModule(module)
		.flatMap((symbol) => component(symbol) ?? [])
		.toSorted(byName)

	return Object.fromEntries(components.map((entry) => [entry.name, entry]))
}

/**
 * The order of the components and of the props. The plugin sorts them, so
 * the page does not sort them as it renders.
 */
function byName(a: { name: string }, b: { name: string }): number {
	return a.name.localeCompare(b.name)
}

/** Whether a declaration is in a package, such as a DOM attribute from `@types/react`. */
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
