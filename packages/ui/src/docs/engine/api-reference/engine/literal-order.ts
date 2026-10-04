import { ts } from 'ts-morph'
import { densitySteps } from '../../../../core/density/steps'
import {
	componentPropsAnnotation,
	RECIPE_ENGINE_PATH,
	TAG_PASS_THROUGHS,
	typeRefName,
} from './ts-utils'

/**
 * The key of a union member in a source order: the value of a string literal in
 * single quotes (`'sm'`), the value of a number literal (`3`), or the keyword of
 * an intrinsic type (`number`, `null`). Null for any other member, which a
 * source order cannot place.
 */
function memberKey(type: ts.Type): string | null {
	if (type.isStringLiteral()) return `'${type.value}'`

	if (type.isNumberLiteral()) return String(type.value)

	const { flags } = type

	if (flags & ts.TypeFlags.Number) return 'number'

	if (flags & ts.TypeFlags.String) return 'string'

	if (flags & ts.TypeFlags.BigInt) return 'bigint'

	if (flags & ts.TypeFlags.Null) return 'null'

	return null
}

/** The key of a literal in source, as {@link memberKey} keys its type. */
function literalKey(node: ts.Node): string | null {
	if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return `'${node.text}'`

	if (ts.isNumericLiteral(node)) return String(Number(node.text))

	if (
		ts.isPrefixUnaryExpression(node) &&
		node.operator === ts.SyntaxKind.MinusToken &&
		ts.isNumericLiteral(node.operand)
	) {
		return String(-Number(node.operand.text))
	}

	if (node.kind === ts.SyntaxKind.NullKeyword) return 'null'

	return null
}

/** The key that a property name gives the literal type `keyof` reads from it. */
function propertyKey(name: ts.PropertyName | ts.DeclarationName | undefined): string | null {
	if (!name) return null

	if (ts.isIdentifier(name) || ts.isStringLiteral(name)) return `'${name.text}'`

	if (ts.isNumericLiteral(name)) return String(Number(name.text))

	return null
}

/** The text that a key gives a template literal, or null for a keyword such as `string`. */
function templateText(key: string): string | null {
	if (key.startsWith("'")) return key.slice(1, -1)

	return /^-?\d/.test(key) ? key : null
}

/** A type node without its parentheses. */
function unparenthesized(node: ts.TypeNode): ts.TypeNode {
	let current = node

	while (ts.isParenthesizedTypeNode(current)) current = current.type

	return current
}

/** The symbol that a name refers to, past an import alias. */
function targetOf(node: ts.Node, checker: ts.TypeChecker): ts.Symbol | undefined {
	return unalias(checker.getSymbolAtLocation(node), checker)
}

/** A symbol past an import alias, which has no value declaration of its own. */
function unalias(symbol: ts.Symbol | undefined, checker: ts.TypeChecker): ts.Symbol | undefined {
	return symbol && symbol.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(symbol) : symbol
}

/**
 * The state of one order walk. `seen` holds the nodes that the walk is inside
 * of, so that a cycle ends. `scope` is the type node that the walk read the
 * declaration from, when the declaration needs it (see {@link recipeOrder}).
 */
type Walk = { checker: ts.TypeChecker; seen: Set<ts.Node>; scope: ts.TypeNode | undefined }

/**
 * The result of `visit`, or an empty list when the walk is already inside
 * `node`. The walk leaves `node` after the visit, so a second
 * reference to the same alias reads it again.
 */
function inside<T>(node: ts.Node, walk: Walk, visit: () => T[]): T[] {
	if (walk.seen.has(node)) return []

	walk.seen.add(node)

	try {
		return visit()
	} finally {
		walk.seen.delete(node)
	}
}

/**
 * The order that the value of a name spells: the elements of an array literal,
 * for `(typeof list)[number]`, or the keys of an object literal, for
 * `keyof typeof table`. A name whose value is another name follows it, as in
 * `width: shaku.panel`.
 */
function valueOrder(node: ts.Node, part: 'elements' | 'keys', walk: Walk): string[] {
	const name = ts.isPropertyAccessExpression(node) ? node.name : node

	const declaration = targetOf(name, walk.checker)?.valueDeclaration

	if (!declaration) return []

	return inside(declaration, walk, () => {
		const value = valueExpression(declaration, walk.checker)

		return value ? expressionOrder(value, part, walk) : []
	})
}

/**
 * The expression that holds the value of a declaration: the initializer of a
 * variable or of a property, the value that a shorthand property names, or the
 * property that a destructured binding reads, as in `const { rounded } = kasane`.
 */
function valueExpression(
	declaration: ts.Declaration,
	checker: ts.TypeChecker,
	seen = new Set<ts.Declaration>(),
): ts.Expression | undefined {
	if (seen.has(declaration)) return undefined

	seen.add(declaration)

	if (ts.isVariableDeclaration(declaration) || ts.isPropertyAssignment(declaration)) {
		return declaration.initializer
	}

	let target: ts.Declaration | undefined

	if (ts.isShorthandPropertyAssignment(declaration)) {
		const value = checker.getShorthandAssignmentValueSymbol(declaration)

		target = unalias(value, checker)?.valueDeclaration
	} else if (ts.isBindingElement(declaration) && ts.isObjectBindingPattern(declaration.parent)) {
		const key = declaration.propertyName ?? declaration.name

		const source = checker.getTypeAtLocation(declaration.parent)

		target = ts.isIdentifier(key) ? source.getProperty(key.text)?.valueDeclaration : undefined
	}

	return target && valueExpression(target, checker, seen)
}

function expressionOrder(node: ts.Expression, part: 'elements' | 'keys', walk: Walk): string[] {
	// `value as T` keeps the order of `value`. When the value spells no keys, the
	// keys come from `T`, as `Object.fromEntries(…) as Record<Step, never[]>`
	// gives them.
	if (
		ts.isAsExpression(node) ||
		ts.isSatisfiesExpression(node) ||
		ts.isTypeAssertionExpression(node)
	) {
		const order = expressionOrder(node.expression, part, walk)

		return order.length > 0 || part === 'elements' ? order : membersOrder(node.type, walk)
	}

	if (ts.isParenthesizedExpression(node)) return expressionOrder(node.expression, part, walk)

	if (part === 'elements' && ts.isArrayLiteralExpression(node)) {
		return node.elements.flatMap((element) => literalKey(element) ?? [])
	}

	if (part === 'keys' && ts.isObjectLiteralExpression(node)) {
		// A spread adds the keys of its value in its place. When the walk cannot
		// read those keys, the order stays short of them, and the coverage test in
		// `orderMembers` refuses it.
		return node.properties.flatMap((property) =>
			ts.isSpreadAssignment(property)
				? expressionOrder(property.expression, 'keys', walk)
				: (propertyKey(property.name) ?? []),
		)
	}

	if (ts.isIdentifier(node) || ts.isPropertyAccessExpression(node)) {
		return valueOrder(node, part, walk)
	}

	// `bridge.palette(palette)`: the keys of the type that the function declares
	// that it returns.
	if (part === 'keys' && ts.isCallExpression(node)) {
		const declaration = walk.checker.getResolvedSignature(node)?.getDeclaration()

		return declaration && ts.isFunctionLike(declaration) && declaration.type
			? membersOrder(declaration.type, walk)
			: []
	}

	return []
}

/** The order of the members that a type node spells, through aliases and `typeof`. */
function typeNodeOrder(node: ts.TypeNode, walk: Walk): string[] {
	return inside(node, walk, () => typeNodeMembers(node, walk))
}

function typeNodeMembers(node: ts.TypeNode, walk: Walk): string[] {
	if (ts.isParenthesizedTypeNode(node)) return typeNodeOrder(node.type, walk)

	if (ts.isUnionTypeNode(node)) return node.types.flatMap((member) => typeNodeOrder(member, walk))

	if (ts.isLiteralTypeNode(node)) {
		const key = literalKey(node.literal)

		return key === null ? [] : [key]
	}

	if (ts.isTemplateLiteralTypeNode(node)) return templateOrder(node, walk)

	switch (node.kind) {
		case ts.SyntaxKind.NumberKeyword:
			return ['number']
		case ts.SyntaxKind.StringKeyword:
			return ['string']
		case ts.SyntaxKind.BigIntKeyword:
			return ['bigint']
	}

	if (ts.isTypeReferenceNode(node)) {
		const declaration = targetOf(node.typeName, walk.checker)?.declarations?.[0]

		// A type parameter, such as `S extends DensityStep`, holds members of its
		// constraint, so the constraint orders them.
		const body =
			declaration && ts.isTypeAliasDeclaration(declaration)
				? typeNodeOrder(declaration.type, walk)
				: declaration && ts.isTypeParameterDeclaration(declaration) && declaration.constraint
					? typeNodeOrder(declaration.constraint, walk)
					: []

		// A filter such as `Extract<Step, 'sm' | 'md'>` spells no order in its own
		// body, so its members keep the order of its arguments.
		if (body.length > 0) return body

		return (node.typeArguments ?? []).flatMap((argument) => typeNodeOrder(argument, walk))
	}

	// `ButtonVariants['size']`: the order of the property that the index names.
	if (
		ts.isIndexedAccessTypeNode(node) &&
		ts.isLiteralTypeNode(node.indexType) &&
		ts.isStringLiteral(node.indexType.literal)
	) {
		const property = walk.checker
			.getTypeFromTypeNode(node.objectType)
			.getProperty(node.indexType.literal.text)

		const declaration = property?.declarations?.[0]

		// The property can come from a recipe, which the object type names.
		return declaration ? declarationOrder(declaration, { ...walk, scope: node.objectType }) : []
	}

	if (ts.isIndexedAccessTypeNode(node)) {
		// `(typeof steps)[number]` needs its parentheses, so the query sits in one.
		const object = unparenthesized(node.objectType)

		if (node.indexType.kind === ts.SyntaxKind.NumberKeyword && ts.isTypeQueryNode(object)) {
			return valueOrder(object.exprName, 'elements', walk)
		}

		// `{ [K in Tag]: … }[Tag]`, the filter that React's `ElementType` spells:
		// its members are keys of the mapped type.
		if (ts.isMappedTypeNode(object) && object.typeParameter.constraint) {
			return typeNodeOrder(object.typeParameter.constraint, walk)
		}
	}

	if (ts.isTypeOperatorNode(node) && node.operator === ts.SyntaxKind.KeyOfKeyword) {
		if (ts.isTypeQueryNode(node.type)) return valueOrder(node.type.exprName, 'keys', walk)

		return membersOrder(node.type, walk)
	}

	return []
}

/**
 * The order of the strings that a template literal type spells: each
 * combination of its spans, with the last span changing fastest. So
 * `` `${Side}-${Alignment}` `` gives `'top-start'`, `'top-end'`, `'right-start'`.
 */
function templateOrder(node: ts.TemplateLiteralTypeNode, walk: Walk): string[] {
	let texts = [node.head.text]

	for (const span of node.templateSpans) {
		const parts = typeNodeOrder(span.type, walk).map(templateText)

		// A span such as `${string}` spells no set of strings.
		if (parts.length === 0 || parts.some((part) => part === null)) return []

		texts = texts.flatMap((text) => parts.map((part) => `${text}${part}${span.literal.text}`))
	}

	return texts.map((text) => `'${text}'`)
}

/** The order of the property names of an object type that a node spells, for `keyof`. */
function membersOrder(node: ts.TypeNode, walk: Walk): string[] {
	if (ts.isTypeLiteralNode(node)) return node.members.flatMap((m) => propertyKey(m.name) ?? [])

	if (!ts.isTypeReferenceNode(node)) return []

	// `Record<K, V>` takes its keys from `K`.
	const [keys] = node.typeArguments ?? []

	if (typeRefName(node.typeName) === 'Record' && keys) return typeNodeOrder(keys, walk)

	const declarations = targetOf(node.typeName, walk.checker)?.declarations ?? []

	// An interface can have more than one declaration, which merge in order.
	const interfaces = declarations.filter(ts.isInterfaceDeclaration)

	if (interfaces.length > 0) {
		return interfaces.flatMap((i) => i.members.flatMap((m) => propertyKey(m.name) ?? []))
	}

	const [declaration] = declarations

	if (declaration && ts.isTypeAliasDeclaration(declaration)) {
		return inside(declaration, walk, () => membersOrder(declaration.type, walk))
	}

	return []
}

/**
 * The source order of the union members that a declaration spells, as keys of
 * {@link memberKey}, or null when it spells none. A declaration with a type
 * node reads that node. A property that a mapped type makes from an object
 * literal, such as a recipe axis, reads the keys of its value. `scope` is the
 * props type node that the declaration comes from. The recipe engine's
 * `variant` and `color` read their order from the recipe that it names (see
 * {@link recipeOrder}).
 *
 * @remarks
 * The checker orders a union's members by type id, and the ids follow the
 * order in which the checker first met each type. That order changes with the
 * files that a pass visits first, so the printed order of `'xs' | 'sm' | 'md'`
 * moved with the pass.
 */
export function sourceOrder(
	declaration: ts.Node | undefined,
	checker: ts.TypeChecker,
	scope?: ts.TypeNode,
): string[] | null {
	if (!declaration) return null

	const order = declarationOrder(declaration, { checker, seen: new Set(), scope })

	return order.length > 0 ? [...new Set(order)] : null
}

function declarationOrder(declaration: ts.Node, walk: Walk): string[] {
	if (
		ts.isPropertySignature(declaration) &&
		ts.isIdentifier(declaration.name) &&
		declaration.getSourceFile().fileName.includes(RECIPE_ENGINE_PATH)
	) {
		return recipeOrder(declaration.name.text, walk)
	}

	if (
		(ts.isPropertySignature(declaration) ||
			ts.isPropertyDeclaration(declaration) ||
			ts.isParameter(declaration) ||
			ts.isTypeAliasDeclaration(declaration)) &&
		declaration.type
	) {
		return typeNodeOrder(declaration.type, walk)
	}

	// A property that a mapped type makes from an object literal, such as a
	// recipe axis: the prop takes the keys of the property's value.
	if (ts.isPropertyAssignment(declaration) || ts.isShorthandPropertyAssignment(declaration)) {
		const value = valueExpression(declaration, walk.checker)

		return value ? expressionOrder(value, 'keys', walk) : []
	}

	return []
}

/**
 * The order of a prop that the recipe engine declares, from the config of the
 * first recipe in the scope that gives one. The palette arm of the engine's
 * `ComputedProps` declares `variant` and `color`, and its types keep no order:
 *
 * - `variant` takes the keys of the palette matrix, then the keys of the
 *   `variant` axis.
 * - `color` takes the order of the palette's color alias, such as
 *   `PaletteColor`, then the keys of the palette overlays, such as `inherit`.
 *
 * The palette is `definePalette(matrix, ...overlays)`. It returns
 * `PaletteConfig<E, M, C>`, and its third argument, `C`, is the color alias.
 */
function recipeOrder(name: string, walk: Walk): string[] {
	for (const config of recipeConfigs(walk.scope, walk)) {
		const palette = config.getProperty('palette')

		const call = palette?.valueDeclaration && callOf(palette.valueDeclaration, walk.checker)

		const [matrix, ...overlays] = call ? call.arguments : []

		const keysOf = (node: ts.Expression | undefined) =>
			node ? expressionOrder(node, 'keys', walk) : []

		let order: string[] = []

		if (name === 'variant') {
			const axis = config.getProperty('variant')?.valueDeclaration

			order = [...keysOf(matrix), ...(axis ? declarationOrder(axis, walk) : [])]
		} else if (name === 'color' && palette) {
			const colors = walk.checker.getTypeOfSymbol(palette).aliasTypeArguments?.[2]

			const alias = colors?.aliasSymbol?.declarations?.[0]

			order = [...(alias ? declarationOrder(alias, walk) : []), ...overlays.flatMap(keysOf)]
		}

		if (order.length > 0) return order
	}

	return []
}

/** The call that holds the value of a declaration, through names that hold it. */
function callOf(declaration: ts.Declaration, checker: ts.TypeChecker): ts.CallExpression | null {
	let value = valueExpression(declaration, checker)

	const seen = new Set<ts.Node>()

	while (value && !seen.has(value)) {
		seen.add(value)

		if (ts.isCallExpression(value)) return value

		if (!ts.isIdentifier(value)) return null

		const target = targetOf(value, checker)?.valueDeclaration

		value = target && valueExpression(target, checker)
	}

	return null
}

/**
 * The configs of the recipes that a props type node takes: the type argument
 * of each `ComputedProps` that it reaches, which `VariantProps<typeof k>` gives.
 * The walk reads aliases, the arguments of references, as those of `Omit`, and
 * the props of a component that `ComponentProps` names.
 */
function recipeConfigs(node: ts.TypeNode | undefined, walk: Walk): ts.Type[] {
	if (!node) return []

	return inside(node, walk, () => {
		if (ts.isIntersectionTypeNode(node) || ts.isUnionTypeNode(node)) {
			return node.types.flatMap((member) => recipeConfigs(member, walk))
		}

		if (ts.isParenthesizedTypeNode(node)) return recipeConfigs(node.type, walk)

		if (!ts.isTypeReferenceNode(node)) return []

		const type = walk.checker.getTypeFromTypeNode(node)

		const alias = type.aliasSymbol?.declarations?.[0]

		const [config] = type.aliasTypeArguments ?? []

		if (
			config &&
			type.aliasSymbol?.getName() === 'ComputedProps' &&
			alias?.getSourceFile().fileName.includes(RECIPE_ENGINE_PATH)
		) {
			return [config]
		}

		// `ComponentProps<typeof Button>` takes the props annotation of `Button`.
		const [first] = node.typeArguments ?? []

		const props =
			first && TAG_PASS_THROUGHS.has(typeRefName(node.typeName))
				? componentPropsAnnotation(first, walk.checker)
				: null

		if (props) return recipeConfigs(props, walk)

		const declaration = targetOf(node.typeName, walk.checker)?.declarations?.[0]

		const body =
			declaration && ts.isTypeAliasDeclaration(declaration)
				? recipeConfigs(declaration.type, walk)
				: []

		return [...body, ...(node.typeArguments ?? []).flatMap((a) => recipeConfigs(a, walk))]
	})
}

/** The key of each density step, in the order of the steps. */
const STEP_KEYS: readonly string[] = densitySteps.map((step) => `'${step}'`)

/**
 * Whether each string literal of a union is a density step, such as the
 * members of a `size`. A union with fewer than two string literals is not.
 */
function isStepUnion(members: readonly ts.Type[]): boolean {
	const keys = members.filter((member) => member.isStringLiteral()).map(memberKey)

	return keys.length > 1 && keys.every((key) => key !== null && STEP_KEYS.includes(key))
}

/**
 * The members of a union in source order. Each member with a key in `source`
 * takes the place that `source` gives it, among the places of such members.
 * Any other member keeps its place.
 *
 * A union of density steps takes the order of the steps, from `xs` to `xl`,
 * in place of `source`. A recipe can give its steps in any order, and a type
 * such as `Exclude<DensityStep, 'xl'>` spells none. Thus each scale shows from
 * small to large.
 *
 * Returns `members` itself when the order is null, or when it leaves out a
 * literal member: a partial order would place that member by type id among
 * members that it places by source.
 */
export function orderMembers(
	members: readonly ts.Type[],
	source: readonly string[] | null,
): readonly ts.Type[] {
	const order = isStepUnion(members) ? STEP_KEYS : source

	if (!order) return members

	// Each member with its rank in `order`, or -1 when `order` cannot place it.
	const ranked = members.map((member) => {
		const key = memberKey(member)

		return { member, rank: key === null ? -1 : order.indexOf(key) }
	})

	if (ranked.some(({ member, rank }) => member.isLiteral() && rank === -1)) return members

	const placed = ranked.filter(({ rank }) => rank !== -1).sort((a, b) => a.rank - b.rank)

	let next = 0

	return ranked.map(({ member, rank }) =>
		rank === -1 ? member : (placed[next++]?.member ?? member),
	)
}
