import ts from 'typescript'

/** Props the docs surface never treats as configurable: React-reserved, structural, or styling noise. */
export const IGNORED_PROPS: ReadonlySet<string> = new Set(['children', 'className', 'key', 'ref'])

/**
 * Pass-through type names whose first type argument is a string-literal tag
 * (`'div'`, `'button'`, …). Shared between pass-through detection and
 * project-prop collection.
 */
export const STRING_LITERAL_PASS_THROUGHS: ReadonlySet<string> = new Set([
	'ComponentPropsWithRef',
	'ComponentPropsWithoutRef',
	'ComponentProps',
	'PropsWithRef',
	'PropsWithoutRef',
	'PolymorphicProps',
])

/** Whether a type-reference name is a recognized HTML/React pass-through. */
export function isPassThroughTypeName(name: string): boolean {
	return STRING_LITERAL_PASS_THROUGHS.has(name) || name.endsWith('HTMLAttributes')
}

/** Dot-joined name of a TypeName: `Foo`, `Foo.Bar`, `Foo.Bar.Baz`. */
export function typeRefName(name: ts.EntityName): string {
	if (ts.isIdentifier(name)) return name.text

	return `${typeRefName(name.left)}.${name.right.text}`
}

/** Follow `import { Foo } from '…'` aliases to the underlying symbol. */
export function unaliasSymbol(symbol: ts.Symbol, checker: ts.TypeChecker): ts.Symbol {
	return symbol.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(symbol) : symbol
}

/** RHS of `type X = …` for a type-name reference, or null if not an alias. */
export function resolveTypeAliasTarget(
	name: ts.EntityName,
	checker: ts.TypeChecker,
): ts.TypeNode | null {
	const symbol = checker.getSymbolAtLocation(ts.isIdentifier(name) ? name : name.right)

	if (!symbol) return null

	const aliased = unaliasSymbol(symbol, checker)

	for (const decl of aliased.getDeclarations() ?? []) {
		if (ts.isTypeAliasDeclaration(decl)) return decl.type
	}

	return null
}

/** String-literal values from a `'a' | 'b'`-style type node. */
export function stringLiteralKeys(node: ts.TypeNode | undefined): string[] {
	if (!node) return []

	if (ts.isLiteralTypeNode(node) && ts.isStringLiteral(node.literal)) return [node.literal.text]

	if (ts.isUnionTypeNode(node)) return node.types.flatMap((t) => stringLiteralKeys(t))

	return []
}

/** The function forms a component can take once wrappers are stripped. */
export type FunctionLikeNode = ts.FunctionDeclaration | ts.FunctionExpression | ts.ArrowFunction

/**
 * Walk into call arguments until the first function / arrow form;
 * `forwardRef(<inner>)` and `memo(<inner>)` wrappers yield the inner function.
 */
export function unwrapFunctionLike(node: ts.Node): FunctionLikeNode | null {
	if (ts.isFunctionDeclaration(node) || ts.isFunctionExpression(node) || ts.isArrowFunction(node)) {
		return node
	}

	if (ts.isCallExpression(node)) {
		for (const arg of node.arguments) {
			const fn = unwrapFunctionLike(arg)

			if (fn) return fn
		}
	}

	return null
}

/** The authored type annotation on a callable's first (props) parameter. */
export function getPropsAnnotation(callable: FunctionLikeNode): ts.TypeNode | undefined {
	return callable.parameters[0]?.type
}
