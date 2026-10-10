import path from 'node:path'
import type { __String, Node, TypeReferenceNode } from 'typescript/unstable/ast'
import type {
	Checker,
	NodeHandle,
	Program,
	Signature,
	Symbol as TsSymbol,
	Type,
} from 'typescript/unstable/sync'
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
	 * `description` instead. For a union of literals, the code at the start of
	 * such a sentence is the default too.
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
	 * An `@internal` prop is not in the list.
	 */
	props: PropApi[]
	/** The props whose name is `on` and an uppercase letter, such as `onChange`, in name order. */
	events: PropApi[]
	/**
	 * The tags whose HTML attributes the component also takes, in name order.
	 * An empty tag stands for any element.
	 */
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
			: a.localeCompare(b, LOCALE)
	}

	return Number(a) - Number(b)
}

function rankOf(value: Literal): number {
	if (typeof value === 'string') return isDensityStep(value) ? 0 : 1

	return typeof value === 'number' ? 2 : 3
}

// One locale for each sort, so that the order does not change with the locale of the build machine.
export const LOCALE = 'en'

const EVENT = /^on[A-Z]/

// The types of React whose argument names the element of the HTML attributes that a props type takes.
const ELEMENT_PROPS = new Set([
	'ComponentProps',
	'ComponentPropsWithRef',
	'ComponentPropsWithoutRef',
])

// An inline link of TSDoc: `{@link target}` or `{@link target | label}`.
const LINK = /\{@link\s+([^\s|}]+)\s*\|?\s*([^}]*)\}/g

const CHANGES = { create: 'created', update: 'changed', delete: 'deleted' } as const

type Ts = typeof import('typescript/unstable/sync')

type Ast = typeof import('typescript/unstable/ast')

/**
 * Creates the extractor for the `ui` package at `root`. It reads the barrel
 * `src/<barrel>/index.ts` through the project of `tsconfig.api.json`, which
 * is the source of `ui` with no tests and no benchmarks.
 */
export function createApiExtractor(root: string): ApiExtractor {
	const config = path.join(import.meta.dirname, 'tsconfig.api.json')

	let server: Promise<{ ts: Ts; ast: Ast; api: InstanceType<Ts['API']> }> | undefined

	let snapshot: ReturnType<InstanceType<Ts['API']>['updateSnapshot']> | undefined

	// The files that changed after the snapshot.
	let changes: Record<(typeof CHANGES)[keyof typeof CHANGES], string[]> | undefined

	return {
		async extract(barrel) {
			server ??= Promise.all([
				import('typescript/unstable/sync'),
				import('typescript/unstable/ast'),
			]).then(([ts, ast]) => ({ ts, ast, api: new ts.API({ cwd: root }) }))

			const { ts, ast, api } = await server

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
				ast,
				project.program,
				project.checker,
				path.join(root, 'src', barrel, 'index.ts'),
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

/** Reads the components, the props, and the events of the barrel at `file`. */
function readBarrel(ts: Ts, ast: Ast, program: Program, checker: Checker, file: string): BarrelApi {
	const { NodeBuilderFlags, SignatureKind, SymbolFlags, TypeFlags } = ts

	// Each literal in single quotes, as the source writes it, and no `...` in a long type.
	const format =
		NodeBuilderFlags.NoTruncation |
		NodeBuilderFlags.UseSingleQuotesForStringLiteralType |
		NodeBuilderFlags.UseAliasDefinedOutsideCurrentScope

	const source = program.getSourceFile(file)

	const module = source && checker.getSymbolAtLocation(source)

	if (!module) throw new Error(`docs: no barrel at ${file}`)

	/** The component of an export: a PascalCase value that takes props, or nothing. */
	function component(exported: TsSymbol): ComponentApi | undefined {
		if (!/^[A-Z]/.test(exported.name)) return undefined

		const symbol =
			exported.flags & SymbolFlags.Alias ? checker.getAliasedSymbol(exported) : exported

		const type = symbol.flags & SymbolFlags.Value ? checker.getTypeOfSymbol(symbol) : undefined

		const [signature] = type ? checker.getSignaturesOfType(type, SignatureKind.Call) : []

		if (!signature) return undefined

		const members = membersOf(checker.getParameterType(signature, 0))

		// A prop that `ui` declares, also when a package declares it too, such as
		// the `color` of a button and of an HTML element.
		const own = [...members].filter(([member]) => !member.declarations.every(isPackage))

		const description = checker.getDocumentationCommentOfSymbol(symbol)

		const elements = elementsOf(symbol, signature, [...members.keys()])

		const apis = own.flatMap(([member, required]) => prop(member, required) ?? []).toSorted(byName)

		return {
			name: exported.name,
			...(description && { description }),
			props: apis.filter((api) => !EVENT.test(api.name)),
			events: apis.filter((api) => EVENT.test(api.name)),
			...(elements.length > 0 && { elements }),
		}
	}

	/**
	 * Each prop of a props type, and whether it is required. A union gives the
	 * props that each arm has, and the alternatives: the props that only some
	 * arms have, such as the `aria-label` and the `aria-labelledby` of
	 * `AccessibleName`. A required alternative stays required when each arm
	 * requires one of the alternatives, as each arm of `AccessibleName`
	 * requires its label.
	 */
	function membersOf(props: Type | undefined): Map<TsSymbol, boolean> {
		const common = props ? checker.getPropertiesOfType(props) : []

		const names = new Set(common.map((member) => member.name))

		const choices = (props?.isUnionType() ? props.getTypes() : []).map((arm) =>
			checker.getPropertiesOfType(arm).filter((member) => !names.has(member.name)),
		)

		const alternatives = new Map(choices.flat().map((member) => [member.name, member]))

		const chosen = choices.every((members) => members.some(isRequired))

		return new Map([
			...common.map((member) => [member, isRequired(member)] as const),
			...[...alternatives.values()].map(
				(member) => [member, chosen && isRequired(member)] as const,
			),
		])
	}

	function isRequired(symbol: TsSymbol): boolean {
		return !(symbol.flags & SymbolFlags.Optional)
	}

	function prop(symbol: TsSymbol, required: boolean): PropApi | undefined {
		const type = checker.getTypeOfSymbol(symbol)

		const defined = type && checker.getNonNullableType(type)

		// A `never` prop is the rest of a union arm that rules the key out.
		if (!type || !defined || defined.flags & TypeFlags.Never) return undefined

		const tags = new Map(
			checker.getJsDocTagsOfSymbol(symbol).map((tag) => [tag.name, tag.text ?? '']),
		)

		// An `@internal` prop is for `ui` itself, such as the `disabled` that
		// `ContextMenu` gives `Menu`. It is not in the API of the component.
		if (tags.has('internal')) return undefined

		const values = valuesOf(defined)

		const deprecated = tags.get('deprecated')

		const { code, sentence } = defaultOf(tags.get('defaultValue') ?? '', values !== undefined)

		const description = [
			checker.getDocumentationCommentOfSymbol(symbol),
			sentence && `Default: ${sentence}`,
		]
			.filter(Boolean)
			.join('\n\n')

		return {
			name: symbol.name,
			...(values ? { values } : { type: textOf(type, defined) }),
			...(required && { required: true }),
			...(code && { default: code }),
			...(description && { description }),
			...(deprecated !== undefined && { deprecated }),
		}
	}

	/**
	 * The text of a prop type without `undefined`. An alias such as `ReactNode`
	 * holds `undefined` itself, and the type without it is a new union of each
	 * member, so the alias prints in its place. The alias also holds its
	 * `null`. Another type keeps its `null` member.
	 */
	function textOf(type: Type, defined: Type): string {
		if (type.getAliasSymbol()) return checker.typeToString(type, undefined, format)

		const text = checker.typeToString(defined, undefined, format)

		const nullable =
			type.isUnionType() && type.getTypes().some((member) => member.flags & TypeFlags.Null)

		return nullable ? `${text} | null` : text
	}

	/**
	 * The members of a union of literals, in order. A union that a package
	 * names, such as the 300 languages of Shiki, keeps its name. A generic
	 * alias, such as `NonNullable<…>`, makes a union but gives it no name.
	 */
	function valuesOf(type: Type): Literal[] | undefined {
		if (!type.isUnionType()) return undefined

		const named =
			type.getAliasSymbol()?.declarations.some(isPackage) &&
			type.getAliasTypeArguments().length === 0

		if (named) return undefined

		const values: Literal[] = []

		for (const member of type.getTypes()) {
			if (!member.isLiteralType() || typeof member.value === 'bigint') return undefined

			values.push(member.value)
		}

		return values.toSorted(compareLiterals)
	}

	/** The tags whose HTML attributes a component takes ({@link readComponent}). */
	function elementsOf(component: TsSymbol, signature: Signature, members: TsSymbol[]): string[] {
		// The elements of the inherited events, such as `HTMLButtonElement`.
		const elements = new Set(
			members
				.filter((member) => EVENT.test(member.name) && member.declarations.every(isPackage))
				.flatMap((member) => {
					const type = checker.getTypeOfSymbol(member)

					const text = type ? checker.typeToString(type, undefined, format) : ''

					return Array.from(text.matchAll(/\bHTML\w*Element\b/g), ([name]) => name)
				}),
		)

		const walk: Walk = { ts, ast, checker, elements, tags: new Set(), bindings: new Map() }

		readComponent(walk, component, signature)

		return [...walk.tags].toSorted()
	}

	const components = checker
		.getExportsOfModule(module)
		.flatMap((symbol) => component(symbol) ?? [])
		.toSorted(byName)

	return Object.fromEntries(components.map((entry) => [entry.name, entry]))
}

/** The state of one walk of {@link readComponent}. */
type Walk = {
	ts: Ts
	ast: Ast
	checker: Checker
	/** The elements of the inherited events of the props. */
	elements: Set<string>
	/** The tags that the walk finds. */
	tags: Set<string>
	/**
	 * The type of each type parameter, by the id of its symbol, as the node of
	 * a type argument or as the type that a call infers.
	 */
	bindings: Map<number, Node | Type>
	/** The props of the tags of React, such as `DetailedHTMLProps<…, HTMLTableDataCellElement>` for `td`. */
	intrinsic?: Type
}

/**
 * Finds the tags whose HTML attributes a component takes: the tag of each
 * `ComponentProps<'tag'>` that its props type is made of, and an empty tag
 * for `HTMLAttributes`, which is the attributes of any element. The walk goes
 * through the unions, the intersections, and the type arguments, such as the
 * `Omit` of `Omit<ComponentProps<'h3'>, 'className'>`; through each alias that
 * `ui` declares, with its type parameters bound to the type arguments; and
 * through `ComponentProps<typeof Button>`. A component that a call makes,
 * such as `createSlot('thead', …)`, binds the type parameters of the call to
 * the types of their arguments. A type in a different place, such as the
 * `ComponentProps<'th'>['scope']` of one prop, does not count.
 *
 * A tag counts only when an inherited event of the props has its element in
 * its type, such as the `HTMLButtonElement` of `onFocus`. An `Omit` or a
 * `Pick` can remove the attributes of a tag that the source names, such as
 * the link of `Omit<ButtonProps & { href?: never }, 'href'>`.
 */
function readComponent(walk: Walk, symbol: TsSymbol, signature: Signature): void {
	bindCall(walk, symbol)

	const node = sourceOf(signature.declaration)

	const [parameter] = node && walk.ast.isFunctionLikeDeclaration(node) ? node.parameters : []

	readType(walk, parameter?.type)
}

/** Binds the type parameters of the call that makes `symbol`, such as the `T` of `createSlot`. */
function bindCall(walk: Walk, symbol: TsSymbol): void {
	const { ast, checker } = walk

	const variable = symbol.valueDeclaration?.resolve()

	const call = variable && ast.isVariableDeclaration(variable) ? variable.initializer : undefined

	const resolved = call && ast.isCallExpression(call) && checker.getResolvedSignature(call)

	const callee = resolved ? sourceOf(resolved.getTarget()?.declaration) : undefined

	if (!resolved || !callee || !ast.isFunctionLikeDeclaration(callee)) return

	const types = checker.getTypeOfSymbol(resolved.getParameters())

	callee.parameters.forEach((parameter, index) => {
		const bound = typeParameterOf(walk, parameter.type)

		const type = types[index]

		if (bound && type) walk.bindings.set(bound.id, type)
	})
}

function readType(walk: Walk, node: Node | undefined): void {
	const { ast } = walk

	if (!node) return

	const parts = ast.isParenthesizedTypeNode(node)
		? [node.type]
		: ast.isUnionTypeNode(node) || ast.isIntersectionTypeNode(node)
			? node.types
			: []

	for (const part of parts) readType(walk, part)

	if (ast.isTypeReferenceNode(node)) readReference(walk, node)
}

function readReference(walk: Walk, node: TypeReferenceNode): void {
	const symbol = symbolAt(walk, node.typeName)

	if (!symbol) return

	// The name of a type of a package, such as `ComponentProps` or `Omit`.
	const name = symbol.declarations.every(isPackage) ? symbol.name : undefined

	if (name && ELEMENT_PROPS.has(name)) {
		readComponentProps(walk, symbol, node.typeArguments?.[0])
	} else if (name === 'HTMLAttributes') {
		if (walk.elements.has('HTMLElement')) walk.tags.add('')
	} else {
		for (const argument of node.typeArguments ?? []) readType(walk, argument)

		for (const declaration of symbol.declarations) {
			readAlias(walk, sourceOf(declaration), node.typeArguments ?? [])
		}
	}
}

/** Reads the argument of `ComponentProps<…>`, with the tags of React from the namespace of `symbol`. */
function readComponentProps(walk: Walk, symbol: TsSymbol, argument: Node | undefined): void {
	const jsx = symbol
		.getParent()
		?.getExports()
		.get('JSX' as __String)

	const map = jsx?.getExports().get('IntrinsicElements' as __String)

	walk.intrinsic ??= map && walk.checker.getDeclaredTypeOfSymbol(map)

	readElement(walk, argument)
}

/** Reads the type of an alias that `ui` declares, with its type parameters bound to `args`. */
function readAlias(walk: Walk, alias: Node | undefined, args: readonly Node[]): void {
	if (!alias || !walk.ast.isTypeAliasDeclaration(alias)) return

	alias.typeParameters?.forEach((parameter, index) => {
		const bound = walk.checker.getSymbolAtLocation(parameter.name)

		const type = args[index] ?? parameter.defaultType

		if (bound && type) walk.bindings.set(bound.id, type)
	})

	readType(walk, alias.type)
}

/** Reads the tag of the argument of `ComponentProps<…>`, through the bindings. */
function readElement(walk: Walk, argument: Node | Type | undefined): void {
	const { ast, checker } = walk

	if (!argument) return

	if (!('kind' in argument)) {
		if (argument.isStringLiteralType()) addTag(walk, String(argument.value))

		return
	}

	if (ast.isLiteralTypeNode(argument) && ast.isStringLiteral(argument.literal)) {
		addTag(walk, argument.literal.text)
	}

	const parameter = typeParameterOf(walk, argument)

	if (parameter) readElement(walk, walk.bindings.get(parameter.id))

	const value = ast.isTypeQueryNode(argument) ? symbolAt(walk, argument.exprName) : undefined

	const type = value && checker.getTypeOfSymbol(value)

	const [signature] = type ? checker.getSignaturesOfType(type, walk.ts.SignatureKind.Call) : []

	if (value && signature) readComponent(walk, value, signature)
}

/** Adds a tag whose element an inherited event has. */
function addTag(walk: Walk, tag: string): void {
	const props = walk.intrinsic && walk.checker.getPropertyOfType(walk.intrinsic, tag)

	const type = props && walk.checker.getTypeOfSymbol(props)

	const element = type?.getAliasTypeArguments()[1]?.getSymbol()?.name

	if (element && walk.elements.has(element)) walk.tags.add(tag)
}

/** The type parameter that a type names, such as the `T` of `ComponentProps<T>`. */
function typeParameterOf(walk: Walk, node: Node | undefined): TsSymbol | undefined {
	const symbol =
		node && walk.ast.isTypeReferenceNode(node) ? symbolAt(walk, node.typeName) : undefined

	return symbol && symbol.flags & walk.ts.SymbolFlags.TypeParameter ? symbol : undefined
}

/** The symbol that a name refers to, through each import. */
function symbolAt({ ts, checker }: Walk, name: Node): TsSymbol | undefined {
	const symbol = checker.getSymbolAtLocation(name)

	return symbol && symbol.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(symbol) : symbol
}

/** The node of a declaration in `ui`. A declaration in a package gives none. */
function sourceOf(declaration: NodeHandle | undefined): Node | undefined {
	return declaration && !isPackage(declaration) ? declaration.resolve() : undefined
}

/**
 * The order of the components and of the props. The plugin sorts them, so
 * the page does not sort them as it renders.
 */
function byName(a: { name: string }, b: { name: string }): number {
	return a.name.localeCompare(b.name, LOCALE)
}

/** Whether a declaration is in a package, such as a DOM attribute from `@types/react`. */
function isPackage(declaration: { path: string }): boolean {
	return declaration.path.includes('/node_modules/')
}

/**
 * The default of a prop from its `@defaultValue` tag: the code, or the
 * sentence. A sentence, such as "The step of the scope.", ends with a period.
 * For a union of literals, a sentence that opens with code, such as "`false`,
 * or the state of the enclosing Control.", gives that code too: the value
 * when no context sets it.
 */
function defaultOf(tag: string, literal: boolean): { code?: string; sentence?: string } {
	const text = plainText(tag)

	if (!text.endsWith('.')) return text ? { code: text } : {}

	const code = literal ? /^`([^`]+)`/.exec(tag.trim())?.[1] : undefined

	return code ? { code, sentence: text } : { sentence: text }
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
