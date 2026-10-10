/// <reference types="vite/client" />
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { basename, join } from 'node:path'
import {
	type ArrowFunction,
	type Node as AstNode,
	type BindingElement,
	type CallExpression,
	type Expression,
	type FunctionDeclaration,
	type FunctionExpression,
	isArrayLiteralExpression,
	isArrowFunction,
	isAsExpression,
	isBinaryExpression,
	isBindingElement,
	isCallExpression,
	isConditionalExpression,
	isFunctionDeclaration,
	isFunctionExpression,
	isIdentifier,
	isJsxExpression,
	isNoSubstitutionTemplateLiteral,
	isNumericLiteral,
	isObjectBindingPattern,
	isObjectLiteralExpression,
	isParenthesizedExpression,
	isPrefixUnaryExpression,
	isPropertyAccessExpression,
	isPropertyAssignment,
	isSatisfiesExpression,
	isShorthandPropertyAssignment,
	isSourceFile,
	isStringLiteral,
	isTypeAliasDeclaration,
	isTypeQueryNode,
	isTypeReferenceNode,
	isVariableDeclaration,
	isVariableDeclarationList,
	isVariableStatement,
	NodeFlags,
	SyntaxKind,
} from 'typescript/unstable/ast'
import {
	API,
	type Checker,
	type Project,
	SymbolFlags,
	type Symbol as TsSymbol,
	type Type,
} from 'typescript/unstable/sync'
import { describe, expect, it } from 'vitest'
import type { ResolvedConfig } from '../../core/recipe/engine/types'
import { srcDir, srcRelative } from '../helpers/walk-source'

// A component applies a default when a prop is unset. The default comes from
// the component itself, or from the recipe that styles it. The docs read the
// default of a prop only from the `@defaultValue` tag on the declaration of the
// prop (CONVENTIONS.md §12.1). Thus a default with no tag does not show, and a
// tag that disagrees with the code shows a false default.
//
// This test holds each tag and its default in step. It reads the defaults and
// the tags with the TypeScript 7 checker, which the docs also read. The rules
// are in two groups.
//
// The kata types. A kata exports the props of a recipe as
// `VariantProps<typeof k>`. That type maps the axes of the recipe, so it has no
// declaration that can hold a tag. The exported type of the kata thus declares
// each defaulted axis again, with the tag.
//
//   1. Each defaulted axis on an exported type has one `@defaultValue` tag.
//   2. The tag equals the default of the recipe, with the quotes of a string.
//   3. An axis with no recipe default has no tag.
//
// The public components. A public component is a PascalCase value that a
// barrel of the `exports` map in `package.json` re-exports, and that resolves
// to a function. The first parameter of the function holds the props.
//
//   4. Each default that the component gives a prop has one tag on the prop,
//      and the tag equals the default. A default is in a destructure, in the
//      parameter or in a `const { … } = props` in the body. A default is also a
//      fallback after `??` on a prop with no destructured default, as in
//      `ariaLabel ?? 'Rating'` or `props.format ?? 'hex'`.
//   5. Each prop that the component gives unset to a recipe axis with a default
//      has one tag on the prop, and the tag equals the recipe default. This rule
//      also reads the recipes that no exported kata type reaches.
//   6. The TSDoc of the component itself has no `@defaultValue` tag. The tag
//      belongs on the prop.
//
// Rule 4 compares the source text of the default with the text of the tag. A
// name of a `const` that holds a string, a number, or a boolean reads as that
// value, so `= DEFAULT_GAP` expects `12`. Any other name reads as itself, and a
// `{@link}` to the name is equal to the name.
//
// A fallback is a default of an optional prop under two conditions. It is a
// literal or a `const` at the top level of a module. The result of the `??` is
// the value of the prop at that place: a JSX attribute or child, a property,
// or a variable. A value that the component computes or reads from a context
// is not a default. A `null` fallback only changes an unset value to `null`.
// A `??` in a call argument, in a destructure, or in the fallback of another
// `??` gives a default to the result of that computation, not to the prop.
//
// Rule 5 follows a prop one step only: from the destructure of the component
// to the call of the recipe in the body of the component. A prop that goes
// through a context or a child component to its recipe is out of reach. Rule 4
// still holds the default that the component itself sets before that step.
//
// The recipe defaults come from the recipes themselves
// (`recipe.config.defaults`). The checker reads the kata files, the barrels,
// and the files that they import, not the whole package, so the scan stays
// fast.

/** Each kata module, keyed by its path from this file. */
const kataModules = import.meta.glob<Record<string, unknown>>('../../recipes/kata/*.ts', {
	eager: true,
})

const uiRoot = join(srcDir, '..')

const kataDir = join(srcDir, 'recipes', 'kata')

const engineTypes = join(srcDir, 'core', 'recipe', 'engine', 'types.ts')

/**
 * The project that the checker opens. The file is not on disk: the API reads
 * its text through the `fs` callback. It extends the package config and lists
 * only the kata files and the public barrels.
 */
const projectConfig = join(uiRoot, 'tsconfig.default-values.json')

/** A callable recipe, as `defineRecipe` returns it. */
type Recipe = ((props?: object) => string) & { readonly config: ResolvedConfig }

/** A recipe that an export of a kata module reaches, with the property path to it. */
type Reached = { path: readonly string[]; recipe: Recipe }

/** A function that can hold the props of a component in its first parameter. */
type FunctionLike = FunctionDeclaration | FunctionExpression | ArrowFunction

/** A public component: its name and its function. */
type Component = { name: string; callable: FunctionLike }

/** A prop that a component destructures, with the binding that reads it. */
type PropBinding = { prop: string; element: BindingElement }

function isRecipe(value: unknown): value is Recipe {
	return typeof value === 'function' && 'config' in value && typeof value.config === 'object'
}

/**
 * Each recipe that the exports of a module reach, such as `k`, `k.item`, or
 * `k.panel`. A sub-recipe is often a local `const` that only an export holds,
 * so the walk follows each property of each object and each recipe.
 */
function reachedRecipes(namespace: Record<string, unknown>): Reached[] {
	const reached: Reached[] = []

	const visit = (value: unknown, path: readonly string[], ancestors: Set<unknown>) => {
		if (value === null || (typeof value !== 'object' && typeof value !== 'function')) return

		if (Array.isArray(value) || ancestors.has(value)) return

		if (isRecipe(value)) reached.push({ path, recipe: value })

		ancestors.add(value)

		for (const [key, child] of Object.entries(value)) visit(child, [...path, key], ancestors)

		ancestors.delete(value)
	}

	for (const [name, value] of Object.entries(namespace)) visit(value, [name], new Set())

	return reached
}

/**
 * The barrels of the public surface: each `index.ts` that the `exports` map of
 * `package.json` names. A `*` in a target stands for each directory that holds
 * an `index.ts`.
 */
function publicBarrels(): string[] {
	const pkg = JSON.parse(readFileSync(join(uiRoot, 'package.json'), 'utf8')) as {
		exports: Record<string, string | { default: string }>
	}

	const barrels = new Set<string>()

	for (const target of Object.values(pkg.exports)) {
		const path = typeof target === 'string' ? target : target.default

		if (!path.endsWith('/index.ts')) continue

		const [head, tail] = path.split('*')

		if (head === undefined) continue

		if (tail === undefined) {
			barrels.add(join(uiRoot, head))

			continue
		}

		for (const entry of readdirSync(join(uiRoot, head), { withFileTypes: true })) {
			const barrel = join(uiRoot, head, entry.name, tail)

			if (entry.isDirectory() && existsSync(barrel)) barrels.add(barrel)
		}
	}

	return [...barrels].sort()
}

/** The source text of a default, as a `@defaultValue` tag writes it: `'solid'`, `false`, `1`. */
function literal(value: string | number | boolean): string {
	return typeof value === 'string' ? `'${value}'` : String(value)
}

/** The source text of a string, number, boolean, or `null` literal, or `undefined` for another expression. */
function primitiveText(node: Expression): string | undefined {
	if (isStringLiteral(node) || isNoSubstitutionTemplateLiteral(node) || isNumericLiteral(node)) {
		return node.getText()
	}

	if (
		node.kind === SyntaxKind.TrueKeyword ||
		node.kind === SyntaxKind.FalseKeyword ||
		node.kind === SyntaxKind.NullKeyword
	) {
		return node.getText()
	}

	if (
		isPrefixUnaryExpression(node) &&
		node.operator === SyntaxKind.MinusToken &&
		isNumericLiteral(node.operand)
	) {
		return node.getText()
	}

	return undefined
}

/** An expression without the casts and the parentheses around it. */
function bare(node: Expression): Expression {
	if (isAsExpression(node) || isSatisfiesExpression(node) || isParenthesizedExpression(node)) {
		return bare(node.expression)
	}

	return node
}

/** The symbol that an import alias names, or the symbol itself. */
function resolved(checker: Checker, symbol: TsSymbol): TsSymbol {
	return symbol.flags & SymbolFlags.Alias ? checker.getAliasedSymbol(symbol) : symbol
}

/** A key for a node that holds across two reads of its file. */
function nodeKey(node: AstNode): string {
	return `${node.getSourceFile().fileName}:${node.pos}`
}

/** The `@defaultValue` tags of a symbol, as their trimmed text. */
function defaultTags(checker: Checker, symbol: TsSymbol): string[] {
	return checker
		.getJsDocTagsOfSymbol(symbol)
		.filter((tag) => tag.name === 'defaultValue')
		.map((tag) => tag.text?.trim() ?? '')
}

/**
 * Whether a `@defaultValue` tag says that the omitted prop is no value: a
 * sentence that does not start with code, such as "No color: the `tone` sets
 * the text color.".
 */
function isNoValueTag(tag: string): boolean {
	return tag.endsWith('.') && !tag.startsWith('`')
}

/** The name of the prop that a binding reads: `size` in `{ size = 'md' }` and in `{ size: step }`. */
function propName(element: BindingElement): string | undefined {
	const key = element.propertyName ?? element.name

	return key && (isIdentifier(key) || isStringLiteral(key)) ? key.text : undefined
}

/** The result of the scan: each break of the rules, and the counts of what it read. */
type Scan = {
	violations: string[]
	types: number
	components: number
	destructured: number
	fallbacks: number
	reached: number
}

function scan(): Scan {
	const kataFiles = Object.keys(kataModules).map((key) => join(kataDir, basename(key)))

	const config = JSON.stringify({
		extends: './tsconfig.json',
		compilerOptions: { incremental: false, types: [] },
		files: [...kataFiles, ...publicBarrels()],
		include: [],
	})

	const api = new API({
		cwd: uiRoot,
		fs: { readFile: (name) => (name === projectConfig ? config : undefined) },
	})

	try {
		const project = api.updateSnapshot({ openProjects: [projectConfig] }).getProject(projectConfig)

		if (!project) throw new Error('the checker did not open the project of the defaults')

		const { program, checker } = project

		const exportsOf = (file: string): readonly TsSymbol[] => {
			const source = program.getSourceFile(file)

			const module = source && checker.getSymbolAtLocation(source)

			return module ? checker.getExportsOfModule(module) : []
		}

		const violations = new Set<string>()

		// The type of each recipe that the kata exports reach, by the id of the
		// type. A `typeof` query of a recipe, and the callee of a call to it, give
		// the same type, so the id links them to the runtime recipe.
		const recipeByType = new Map<number, Recipe>()

		for (const [key, namespace] of Object.entries(kataModules)) {
			const symbolByName = new Map(
				exportsOf(join(kataDir, basename(key))).map((symbol) => [symbol.name, symbol]),
			)

			for (const { path, recipe } of reachedRecipes(namespace)) {
				const [head, ...rest] = path

				const symbol = head === undefined ? undefined : symbolByName.get(head)

				let type: Type | undefined = symbol && checker.getTypeOfSymbol(symbol)

				for (const property of rest) {
					const member = type && checker.getPropertyOfType(type, property)

					type = member && checker.getTypeOfSymbol(member)
				}

				if (type) recipeByType.set(type.id, recipe)
			}
		}

		const types = scanKataTypes(project, exportsOf, recipeByType, violations)

		const components = publicComponents(project, exportsOf, violations)

		let destructured = 0

		let fallbacks = 0

		let reached = 0

		for (const component of components) {
			const counts = scanComponent(project, component, recipeByType, violations)

			destructured += counts.destructured

			fallbacks += counts.fallbacks

			reached += counts.reached
		}

		return {
			violations: [...violations],
			types,
			components: components.length,
			destructured,
			fallbacks,
			reached,
		}
	} finally {
		api.close()
	}
}

/** Rules 1 to 3: hold the tags on the exported types of the kata to the recipe defaults. */
function scanKataTypes(
	project: Project,
	exportsOf: (file: string) => readonly TsSymbol[],
	recipeByType: ReadonlyMap<number, Recipe>,
	violations: Set<string>,
): number {
	const { checker } = project

	const variantProps = exportsOf(engineTypes).find((symbol) => symbol.name === 'VariantProps')

	if (!variantProps) throw new Error('the checker found no `VariantProps` in the recipe engine')

	let checked = 0

	for (const key of Object.keys(kataModules)) {
		const label = `recipes/kata/${basename(key)}`

		for (const exported of exportsOf(join(kataDir, basename(key)))) {
			const declaration = exported.declarations[0]?.resolve(project)

			if (!declaration || !isTypeAliasDeclaration(declaration)) continue

			// The recipes that the type reads through `VariantProps<typeof …>`.
			const recipes = new Set<Recipe>()

			const visit = (node: AstNode) => {
				if (isTypeReferenceNode(node)) {
					const name = checker.getSymbolAtLocation(node.typeName)

					const [argument] = node.typeArguments ?? []

					if (name && resolved(checker, name).id === variantProps.id && argument) {
						const type = isTypeQueryNode(argument) ? checker.getTypeAtLocation(argument) : undefined

						const recipe = type && recipeByType.get(type.id)

						if (recipe) recipes.add(recipe)
						else violations.add(`${label} → ${exported.name}: no export reaches its recipe`)
					}
				}

				node.forEachChild(visit)
			}

			visit(declaration.type)

			if (recipes.size === 0) continue

			checked++

			const properties = checker.getPropertiesOfType(checker.getDeclaredTypeOfSymbol(exported))

			for (const property of properties) {
				for (const { config } of recipes) {
					// An own key only: a union of strings has `toString` and other members of
					// the prototype as properties.
					if (!Object.hasOwn(config.variants, property.name)) continue

					const value = Object.hasOwn(config.defaults, property.name)
						? config.defaults[property.name]
						: undefined

					const expected = value === undefined ? [] : [literal(value)]

					const tags = defaultTags(checker, property)

					if (tags.join('\n') === expected.join('\n')) continue

					// With no recipe default, the omitted axis is no value, and the tag can
					// say so in a sentence (CONVENTIONS.md §12.1).
					if (expected.length === 0 && tags.length === 1 && isNoValueTag(tags[0] ?? '')) continue

					violations.add(
						`${label} → ${exported.name}.${property.name}: @defaultValue ${tags.join(', ') || '(none)'}, recipe default ${expected.join(', ') || '(none)'}`,
					)
				}
			}
		}
	}

	return checked
}

/**
 * Each public component, once. A wrapper such as `memo(…)`, a cast, or an
 * `Object.assign(Root, …)` resolves to the function inside it. A value that
 * resolves to no function, such as a context or a `createSlot` slot, is not a
 * component here: no parameter of its own holds a default.
 */
function publicComponents(
	project: Project,
	exportsOf: (file: string) => readonly TsSymbol[],
	violations: Set<string>,
): Component[] {
	const { checker } = project

	const unwrap = (node: AstNode | undefined, depth: number): FunctionLike | undefined => {
		if (!node || depth > 8) return undefined

		if (isFunctionDeclaration(node) || isFunctionExpression(node) || isArrowFunction(node)) {
			return node
		}

		if (isVariableDeclaration(node)) return unwrap(node.initializer, depth + 1)

		if (isAsExpression(node) || isSatisfiesExpression(node) || isParenthesizedExpression(node)) {
			return unwrap(node.expression, depth + 1)
		}

		if (isCallExpression(node)) {
			for (const argument of node.arguments) {
				const callable = unwrap(argument, depth + 1)

				if (callable) return callable
			}

			return undefined
		}

		if (isIdentifier(node)) {
			const symbol = checker.getSymbolAtLocation(node)

			const declaration = symbol && resolved(checker, symbol).valueDeclaration?.resolve(project)

			return declaration === node ? undefined : unwrap(declaration, depth + 1)
		}

		return undefined
	}

	const components: Component[] = []

	const seen = new Set<number>()

	for (const barrel of publicBarrels()) {
		for (const exported of exportsOf(barrel)) {
			if (!/^[A-Z]/.test(exported.name)) continue

			const target = resolved(checker, exported)

			if (!(target.flags & SymbolFlags.Value) || seen.has(target.id)) continue

			seen.add(target.id)

			const callable = unwrap(target.valueDeclaration?.resolve(project), 0)

			if (!callable) continue

			components.push({ name: exported.name, callable })

			// Rule 6: the tag belongs on the prop, not on the component.
			if (defaultTags(checker, target).length > 0) {
				violations.add(
					`${srcRelative(callable.getSourceFile().fileName)} → ${exported.name}: @defaultValue on the component, not on its prop`,
				)
			}
		}
	}

	return components
}

/**
 * The props that a component destructures: in its first parameter, or in a
 * `const { … } = props` in its body. A rest element reads no single prop.
 *
 * @remarks A `data-*` attribute, such as `data-slot`, is not in the result. It
 * is a hook for the selectors of a parent or a wrapper, not an option, so the
 * docs do not show it (`extract-props.ts`). A wrapper also writes its own
 * value over the default of the component that it wraps, so one tag on the
 * shared declaration would be false for the wrapper.
 */
function propBindings(project: Project, callable: FunctionLike): PropBinding[] {
	const { checker } = project

	const [parameter] = callable.parameters

	if (!parameter) return []

	const elements: BindingElement[] = []

	if (isObjectBindingPattern(parameter.name)) {
		elements.push(...parameter.name.elements)
	} else if (isIdentifier(parameter.name) && callable.body) {
		const props = checker.getSymbolAtLocation(parameter.name)

		const visit = (node: AstNode) => {
			if (
				isVariableDeclaration(node) &&
				isObjectBindingPattern(node.name) &&
				node.initializer &&
				isIdentifier(node.initializer) &&
				props &&
				checker.getSymbolAtLocation(node.initializer)?.id === props.id
			) {
				elements.push(...node.name.elements)
			}

			node.forEachChild(visit)
		}

		visit(callable.body)
	}

	const bindings: PropBinding[] = []

	for (const element of elements) {
		const prop = element.dotDotDotToken ? undefined : propName(element)

		if (prop !== undefined && !prop.startsWith('data-')) bindings.push({ prop, element })
	}

	return bindings
}

/**
 * The tag text that a destructured default expects, and whether the default is
 * a name. A name of a `const` that holds a primitive literal reads as that
 * literal. Any other expression reads as its source text.
 */
function expectedDefault(
	project: Project,
	initializer: Expression,
): { text: string; name: boolean } {
	const node = bare(initializer)

	const primitive = primitiveText(node)

	if (primitive !== undefined) return { text: primitive, name: false }

	if (!isIdentifier(node)) return { text: node.getText(), name: false }

	const symbol = project.checker.getSymbolAtLocation(node)

	const declaration = symbol && resolved(project.checker, symbol).valueDeclaration?.resolve(project)

	if (
		declaration &&
		isVariableDeclaration(declaration) &&
		declaration.initializer &&
		isVariableDeclarationList(declaration.parent) &&
		declaration.parent.flags & NodeFlags.Const
	) {
		const value = primitiveText(bare(declaration.initializer))

		if (value !== undefined) return { text: value, name: false }
	}

	return { text: node.text, name: true }
}

/** Whether two handles name the same node of one file. */
function sameNode(a: AstNode, b: AstNode): boolean {
	return a.pos === b.pos && a.end === b.end
}

/**
 * Whether the result of a `??` is the value of its prop at that place: a JSX
 * attribute or child, a property, or a variable with one name. A branch of a
 * `?:` keeps the place of the `?:`. In any other place, the result goes into a
 * computation.
 */
function standsAlone(node: AstNode): boolean {
	let child = node

	let parent = node.parent

	while (
		parent &&
		(isParenthesizedExpression(parent) ||
			isAsExpression(parent) ||
			isSatisfiesExpression(parent) ||
			(isConditionalExpression(parent) && !sameNode(parent.condition, child)))
	) {
		child = parent

		parent = parent.parent
	}

	if (!parent) return false

	if (isJsxExpression(parent)) return true

	if (isPropertyAssignment(parent)) return sameNode(parent.initializer, child)

	return isVariableDeclaration(parent) && isIdentifier(parent.name)
}

/**
 * The tag text that a fallback after `??` expects, and whether the fallback is
 * a name. A literal of a primitive, or an array of them, reads as its source
 * text. A `const` at the top level of a module reads as its value when it
 * holds a primitive, else as its name. Another expression is `undefined`: the
 * component computes it, or reads it from a context.
 */
function fallbackDefault(
	project: Project,
	fallback: Expression,
): { text: string; name: boolean } | undefined {
	const node = bare(fallback)

	if (node.kind === SyntaxKind.NullKeyword) return undefined

	const primitive = primitiveText(node)

	if (primitive !== undefined) return { text: primitive, name: false }

	if (
		isArrayLiteralExpression(node) &&
		node.elements.every((element) => primitiveText(bare(element)) !== undefined)
	) {
		return { text: node.getText(), name: false }
	}

	if (!isIdentifier(node)) return undefined

	const symbol = project.checker.getSymbolAtLocation(node)

	const declaration = symbol && resolved(project.checker, symbol).valueDeclaration?.resolve(project)

	const list = declaration?.parent

	if (
		!declaration ||
		!isVariableDeclaration(declaration) ||
		!declaration.initializer ||
		!list ||
		!isVariableDeclarationList(list) ||
		!(list.flags & NodeFlags.Const) ||
		!isVariableStatement(list.parent) ||
		!isSourceFile(list.parent.parent)
	) {
		return undefined
	}

	const value = primitiveText(bare(declaration.initializer))

	return value === undefined ? { text: node.text, name: true } : { text: value, name: false }
}

/** Rules 4 and 5: hold the tags on the props of one component to its defaults. */
function scanComponent(
	project: Project,
	{ name, callable }: Component,
	recipeByType: ReadonlyMap<number, Recipe>,
	violations: Set<string>,
): { destructured: number; fallbacks: number; reached: number } {
	const { checker } = project

	const label = `${srcRelative(callable.getSourceFile().fileName)} → ${name}`

	const bindings = propBindings(project, callable)

	const [parameter] = callable.parameters

	if (!parameter) return { destructured: 0, fallbacks: 0, reached: 0 }

	const propsType = parameter.type
		? checker.getTypeFromTypeNode(parameter.type)
		: checker.getTypeAtLocation(parameter)

	/** Compare the tags of a prop with the one tag that the default expects. */
	const check = (prop: string, expected: string, isName: boolean, source: string) => {
		const symbol = propsType && checker.getPropertyOfType(propsType, prop)

		if (!symbol) {
			violations.add(`${label}.${prop}: the props type declares no \`${prop}\``)

			return
		}

		const tags = [...new Set(defaultTags(checker, symbol))]

		const [tag] = tags

		if (tags.length === 1 && (tag === expected || (isName && tag === `{@link ${expected}}`))) {
			return
		}

		violations.add(
			`${label}.${prop}: @defaultValue ${tags.join(', ') || '(none)'}, ${source} ${expected}`,
		)
	}

	let destructured = 0

	// Rule 4: a destructured default.
	for (const { prop, element } of bindings) {
		if (!element.initializer) continue

		destructured++

		const expected = expectedDefault(project, element.initializer)

		check(prop, expected.text, expected.name, 'default')
	}

	// The bindings with no default, by the key of their node. Rule 4 reads the
	// fallback of such a prop, and rule 5 reads the recipe axis that it reaches.
	const unset = new Map(
		bindings
			.filter(({ element }) => !element.initializer)
			.map((binding) => [nodeKey(binding.element), binding.prop]),
	)

	const props = isIdentifier(parameter.name)
		? checker.getSymbolAtLocation(parameter.name)
		: undefined

	/** The prop that a value reads unset, or `undefined`. */
	const unsetProp = (value: AstNode): string | undefined => {
		if (isPropertyAccessExpression(value) && isIdentifier(value.expression)) {
			const owner = checker.getSymbolAtLocation(value.expression)

			return props && owner?.id === props.id ? value.name.text : undefined
		}

		const symbol = isShorthandPropertyAssignment(value)
			? checker.getShorthandAssignmentValueSymbol(value)
			: isIdentifier(value)
				? checker.getSymbolAtLocation(value)
				: undefined

		const declaration = symbol?.valueDeclaration?.resolve(project)

		return declaration && isBindingElement(declaration)
			? unset.get(nodeKey(declaration))
			: undefined
	}

	const calls: CallExpression[] = []

	let fallbacks = 0

	const visit = (node: AstNode) => {
		const [argument] = isCallExpression(node) ? node.arguments : []

		if (isCallExpression(node) && argument && isObjectLiteralExpression(argument)) calls.push(node)

		// Rule 4: a fallback after `??` on an optional prop that the component
		// reads unset.
		if (
			isBinaryExpression(node) &&
			node.operatorToken.kind === SyntaxKind.QuestionQuestionToken &&
			standsAlone(node)
		) {
			const prop = unsetProp(bare(node.left))

			const symbol =
				prop === undefined ? undefined : propsType && checker.getPropertyOfType(propsType, prop)

			const expected =
				symbol && symbol.flags & SymbolFlags.Optional
					? fallbackDefault(project, node.right)
					: undefined

			if (prop !== undefined && expected) {
				fallbacks++

				check(prop, expected.text, expected.name, 'fallback')
			}
		}

		node.forEachChild(visit)
	}

	if (callable.body) visit(callable.body)

	// Rule 5: a prop that reaches a recipe axis unset.
	let reached = 0

	for (const call of calls) {
		const type = checker.getTypeAtLocation(call.expression)

		const recipe = type && recipeByType.get(type.id)

		const [argument] = call.arguments

		if (!recipe || !argument || !isObjectLiteralExpression(argument)) continue

		for (const property of argument.properties) {
			if (!isPropertyAssignment(property) && !isShorthandPropertyAssignment(property)) continue

			const axis = property.name.getText()

			const value = Object.hasOwn(recipe.config.defaults, axis)
				? recipe.config.defaults[axis]
				: undefined

			if (value === undefined) continue

			const prop = unsetProp(isPropertyAssignment(property) ? bare(property.initializer) : property)

			if (prop === undefined) continue

			reached++

			check(prop, literal(value), false, `recipe default of \`${axis}\``)
		}
	}

	return { destructured, fallbacks, reached }
}

describe('default value boundary', () => {
	const { violations, types, components, destructured, fallbacks, reached } = scan()

	it('reads the kata types, the components, and their defaults', () => {
		// A scan that linked no type to its recipe, found no component, or read no
		// default would pass the case below with no violation.
		expect(types).toBeGreaterThan(30)

		expect(components).toBeGreaterThan(250)

		expect(destructured).toBeGreaterThan(250)

		expect(fallbacks).toBeGreaterThan(20)

		expect(reached).toBeGreaterThan(30)
	})

	it('gives each default a @defaultValue tag on its prop that equals the default', () => {
		expect(
			violations,
			`a @defaultValue tag and its default disagree (CONVENTIONS.md §12.1):\n${violations.join('\n')}`,
		).toEqual([])
	})
})
