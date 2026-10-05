import { ts } from 'ts-morph'

/**
 * The path segment of the recipe engine. Its internals (`Recipe`,
 * `RecipeBase`, `ResolvedConfig`, `VariantProps`, …) get the same treatment as
 * `node_modules`: no reference card shows them.
 */
export const RECIPE_ENGINE_PATH = '/core/recipe/engine/'

/** Dot-joined name of a TypeName: `Foo`, `Foo.Bar`, `Foo.Bar.Baz`. */
export function typeRefName(name: ts.EntityName): string {
	if (ts.isIdentifier(name)) return name.text

	return `${typeRefName(name.left)}.${name.right.text}`
}

/** Follow `import { Foo } from '…'` aliases to the underlying symbol. */
export function unaliasSymbol(symbol: ts.Symbol, checker: ts.TypeChecker): ts.Symbol {
	return symbol.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(symbol) : symbol
}

/** A single-signature function type — the shape that needs parentheses inside a union. */
export function isFunctionType(type: ts.Type): boolean {
	return type.getCallSignatures().length > 0 && type.getProperties().length === 0
}

/**
 * The type-parameter bindings of an annotation walk. Each bound parameter maps
 * to the type argument that binds it, with the bindings that the argument
 * reads in turn: an argument is written in the scope of the reference, not of
 * the alias.
 */
export type Bindings = ReadonlyMap<ts.TypeParameterDeclaration, Bound>

/** A type node, and the bindings that its type parameters read. */
export type Bound = { node: ts.TypeNode; bindings: Bindings }

/** The bindings of an annotation, which no alias has entered yet. */
export const NO_BINDINGS: Bindings = new Map()

/** The declaration that a type reference names, past an import alias. */
function referencedDeclarations(
	node: ts.TypeReferenceNode,
	checker: ts.TypeChecker,
): readonly ts.Declaration[] {
	const name = ts.isIdentifier(node.typeName) ? node.typeName : node.typeName.right

	const symbol = checker.getSymbolAtLocation(name)

	return symbol ? (unaliasSymbol(symbol, checker).getDeclarations() ?? []) : []
}

/**
 * A type node past each reference to a type parameter: the argument that binds
 * it, with the argument's own bindings. A parameter that no argument binds
 * reads its default, as the component's own `F extends ElementType = 'div'`
 * does. Any other node returns as it is.
 */
export function resolveBound(
	node: ts.TypeNode,
	bindings: Bindings,
	checker: ts.TypeChecker,
): Bound {
	let current: Bound = { node, bindings }

	// A default that names its own parameter, directly or not, ends the walk.
	const seen = new Set<ts.TypeParameterDeclaration>()

	for (;;) {
		const { node: next, bindings: scope } = current

		if (!ts.isTypeReferenceNode(next) || next.typeArguments) return current

		const parameter = referencedDeclarations(next, checker).find(ts.isTypeParameterDeclaration)

		if (!parameter || seen.has(parameter)) return current

		seen.add(parameter)

		const bound =
			scope.get(parameter) ??
			(parameter.default ? { node: parameter.default, bindings: scope } : undefined)

		if (!bound) return current

		current = bound
	}
}

/**
 * The right-hand side of the alias that a reference names. The alias's type
 * parameters bind to the reference's arguments, or else to their defaults.
 * Null when the reference names no type alias.
 *
 * @remarks
 * A walk of the right-hand side reads each parameter through the bindings, so
 * `PolymorphicStaticProps<'span', 'prefix'>` reads `ComponentProps<'span'>`
 * and omits `'prefix'`. Unbound, the walk found no tag and no omitted key.
 */
export function aliasTarget(
	node: ts.TypeReferenceNode,
	bindings: Bindings,
	checker: ts.TypeChecker,
): Bound | null {
	const alias = referencedDeclarations(node, checker).find(ts.isTypeAliasDeclaration)

	if (!alias) return null

	const own = new Map<ts.TypeParameterDeclaration, Bound>()

	alias.typeParameters?.forEach((parameter, i) => {
		const argument = node.typeArguments?.[i]

		// A default reads the alias's own parameters, as `B = A` does.
		if (argument) own.set(parameter, { node: argument, bindings })
		else if (parameter.default) own.set(parameter, { node: parameter.default, bindings: own })
	})

	return { node: alias.type, bindings: own }
}

/** The string literal that a type node is, or that a bound parameter binds it to. */
export function boundStringLiteral(
	node: ts.TypeNode | undefined,
	bindings: Bindings,
	checker: ts.TypeChecker,
): string | null {
	if (!node) return null

	const resolved = resolveBound(node, bindings, checker).node

	if (ts.isLiteralTypeNode(resolved) && ts.isStringLiteral(resolved.literal)) {
		return resolved.literal.text
	}

	// A parameter that nothing binds resolves to itself, which is no literal.
	const type = checker.getTypeFromTypeNode(resolved)

	return type.isStringLiteral() ? type.value : null
}

/**
 * String-literal values from a `'a' | 'b'`-style type node. With a checker, a
 * bound type parameter reads its argument, as `'className' | Omitted` does.
 */
export function stringLiteralKeys(
	node: ts.TypeNode | undefined,
	bindings: Bindings = NO_BINDINGS,
	checker?: ts.TypeChecker,
): string[] {
	if (!node) return []

	const bound = checker ? resolveBound(node, bindings, checker) : { node, bindings }

	const resolved = bound.node

	if (ts.isLiteralTypeNode(resolved) && ts.isStringLiteral(resolved.literal)) {
		return [resolved.literal.text]
	}

	if (ts.isUnionTypeNode(resolved)) {
		return resolved.types.flatMap((t) => stringLiteralKeys(t, bound.bindings, checker))
	}

	return []
}

/**
 * Pass-through type names whose first type argument is the tag (`'div'`,
 * `'button'`, …). The argument makes the reference a pass-through only when it
 * is, or binds to, a string literal. `ComponentProps<typeof Panel>` takes the
 * props of a component, not the attributes of a tag.
 */
export const TAG_PASS_THROUGHS: ReadonlySet<string> = new Set([
	'ComponentPropsWithRef',
	'ComponentPropsWithoutRef',
	'ComponentProps',
])

/**
 * Wrappers whose argument is a props type, not a tag. A walk reads through
 * them to the argument.
 */
export const PROPS_WRAPPERS: ReadonlySet<string> = new Set(['PropsWithRef', 'PropsWithoutRef'])

/** Whether a type-reference name is a recognized HTML/React pass-through. */
export function isPassThroughTypeName(name: string): boolean {
	return TAG_PASS_THROUGHS.has(name) || name.endsWith('HTMLAttributes')
}

/**
 * The props annotation of the component that `typeof X` names: the type of the
 * first parameter of a function declaration, or of an arrow or function
 * expression that a variable holds. Null for any other node or declaration.
 */
export function componentPropsAnnotation(
	node: ts.TypeNode,
	checker: ts.TypeChecker,
): ts.TypeNode | null {
	if (!ts.isTypeQueryNode(node)) return null

	const name = ts.isIdentifier(node.exprName) ? node.exprName : node.exprName.right

	const symbol = checker.getSymbolAtLocation(name)

	const declaration = symbol && unaliasSymbol(symbol, checker).valueDeclaration

	if (!declaration) return null

	const initializer = ts.isVariableDeclaration(declaration) ? declaration.initializer : undefined

	const component = ts.isFunctionDeclaration(declaration)
		? declaration
		: initializer && (ts.isArrowFunction(initializer) || ts.isFunctionExpression(initializer))
			? initializer
			: undefined

	return component?.parameters[0]?.type ?? null
}
