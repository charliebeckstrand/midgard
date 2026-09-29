import { ts } from 'ts-morph'

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

/** An expression without the wrappers that keep its value: `as`, `satisfies`, parentheses. */
function unwrap(node: ts.Expression): ts.Expression {
	let current = node

	while (
		ts.isAsExpression(current) ||
		ts.isSatisfiesExpression(current) ||
		ts.isParenthesizedExpression(current) ||
		ts.isTypeAssertionExpression(current)
	) {
		current = current.expression
	}

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

type Walk = { checker: ts.TypeChecker; seen: Set<ts.Node> }

/**
 * The order that the value of a name spells: the elements of an array literal,
 * for `(typeof list)[number]`, or the keys of an object literal, for
 * `keyof typeof table`. A name whose value is another name follows it, as in
 * `width: shaku.panel`.
 */
function valueOrder(node: ts.Node, part: 'elements' | 'keys', walk: Walk): string[] {
	const name = ts.isPropertyAccessExpression(node) ? node.name : node

	const declaration = targetOf(name, walk.checker)?.valueDeclaration

	const value = declaration && valueExpression(declaration, walk)

	return value ? expressionOrder(value, part, walk) : []
}

/**
 * The expression that holds the value of a declaration: the initializer of a
 * variable or of a property, the value that a shorthand property names, or the
 * property that a destructured binding reads, as in `const { rounded } = kasane`.
 */
function valueExpression(declaration: ts.Declaration, walk: Walk): ts.Expression | undefined {
	if (walk.seen.has(declaration)) return undefined

	walk.seen.add(declaration)

	if (ts.isVariableDeclaration(declaration) || ts.isPropertyAssignment(declaration)) {
		return declaration.initializer
	}

	let target: ts.Declaration | undefined

	if (ts.isShorthandPropertyAssignment(declaration)) {
		const value = walk.checker.getShorthandAssignmentValueSymbol(declaration)

		target = unalias(value, walk.checker)?.valueDeclaration
	} else if (ts.isBindingElement(declaration) && ts.isObjectBindingPattern(declaration.parent)) {
		const key = declaration.propertyName ?? declaration.name

		const source = walk.checker.getTypeAtLocation(declaration.parent)

		target = ts.isIdentifier(key) ? source.getProperty(key.text)?.valueDeclaration : undefined
	}

	return target && valueExpression(target, walk)
}

function expressionOrder(node: ts.Expression, part: 'elements' | 'keys', walk: Walk): string[] {
	const value = unwrap(node)

	if (part === 'elements' && ts.isArrayLiteralExpression(value)) {
		return value.elements.flatMap((element) => literalKey(element) ?? [])
	}

	if (part === 'keys' && ts.isObjectLiteralExpression(value)) {
		// A spread contributes keys that no name here spells, so the order stays
		// short of them, and the coverage test in `orderMembers` refuses it.
		return value.properties.flatMap((property) => propertyKey(property.name) ?? [])
	}

	if (ts.isIdentifier(value) || ts.isPropertyAccessExpression(value)) {
		return valueOrder(value, part, walk)
	}

	return []
}

/** The order of the members that a type node spells, through aliases and `typeof`. */
function typeNodeOrder(node: ts.TypeNode, walk: Walk): string[] {
	if (walk.seen.has(node)) return []

	walk.seen.add(node)

	if (ts.isParenthesizedTypeNode(node)) return typeNodeOrder(node.type, walk)

	if (ts.isUnionTypeNode(node)) return node.types.flatMap((member) => typeNodeOrder(member, walk))

	if (ts.isLiteralTypeNode(node)) {
		const key = literalKey(node.literal)

		return key === null ? [] : [key]
	}

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

		return declaration ? declarationOrder(declaration, walk) : []
	}

	if (ts.isIndexedAccessTypeNode(node) && node.indexType.kind === ts.SyntaxKind.NumberKeyword) {
		// `(typeof steps)[number]` needs its parentheses, so the query sits in one.
		let object = node.objectType

		while (ts.isParenthesizedTypeNode(object)) object = object.type

		if (ts.isTypeQueryNode(object)) return valueOrder(object.exprName, 'elements', walk)
	}

	if (ts.isTypeOperatorNode(node) && node.operator === ts.SyntaxKind.KeyOfKeyword) {
		if (ts.isTypeQueryNode(node.type)) return valueOrder(node.type.exprName, 'keys', walk)

		return membersOrder(node.type, walk)
	}

	return []
}

/** The order of the property names of an object type that a node spells, for `keyof`. */
function membersOrder(node: ts.TypeNode, walk: Walk): string[] {
	if (ts.isTypeLiteralNode(node)) return node.members.flatMap((m) => propertyKey(m.name) ?? [])

	if (!ts.isTypeReferenceNode(node)) return []

	const declaration = targetOf(node.typeName, walk.checker)?.declarations?.[0]

	if (declaration && ts.isInterfaceDeclaration(declaration)) {
		return declaration.members.flatMap((m) => propertyKey(m.name) ?? [])
	}

	if (declaration && ts.isTypeAliasDeclaration(declaration))
		return membersOrder(declaration.type, walk)

	return []
}

/**
 * The source order of the union members that a declaration spells, as keys of
 * {@link memberKey}, or null when it spells none. A declaration with a type
 * node reads that node. A property that a mapped type makes from an object
 * literal, such as a recipe axis, reads the keys of its value.
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
): string[] | null {
	if (!declaration) return null

	const order = declarationOrder(declaration, { checker, seen: new Set() })

	return order.length > 0 ? [...new Set(order)] : null
}

function declarationOrder(declaration: ts.Node, walk: Walk): string[] {
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
		const value = valueExpression(declaration, walk)

		return value ? expressionOrder(value, 'keys', walk) : []
	}

	return []
}

/**
 * The members of a union in source order. Each member with a key in `order`
 * takes the place that `order` gives it, among the places of such members.
 * Any other member keeps its place.
 *
 * Returns `members` itself when `order` is null, or when it leaves out a
 * literal member: a partial order would place that member by type id among
 * members that it places by source.
 */
export function orderMembers(
	members: readonly ts.Type[],
	order: readonly string[] | null,
): readonly ts.Type[] {
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
