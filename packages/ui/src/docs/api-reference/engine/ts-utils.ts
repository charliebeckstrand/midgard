import { ts } from 'ts-morph'

/** Get the dot-separated name from a TypeName — `Foo` or `Foo.Bar`. */
export function typeRefName(name: ts.EntityName): string {
	if (ts.isIdentifier(name)) return name.text

	return `${typeRefName(name.left)}.${name.right.text}`
}

/** Resolve a symbol through import aliasing (`import { Foo } from '…'`). */
export function unaliasSymbol(symbol: ts.Symbol, checker: ts.TypeChecker): ts.Symbol {
	return symbol.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(symbol) : symbol
}

/** Follow a type-name reference to its `type X = …` RHS, if any. */
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

/** Collect string-literal values from a `'a' | 'b'`-style type node. */
export function stringLiteralKeys(node: ts.TypeNode | undefined): string[] {
	if (!node) return []

	if (ts.isLiteralTypeNode(node) && ts.isStringLiteral(node.literal)) return [node.literal.text]

	if (ts.isUnionTypeNode(node)) return node.types.flatMap((t) => stringLiteralKeys(t))

	return []
}

/**
 * Pass-through type names that take a string-literal tag (e.g. `'div'`) as
 * their first type argument. Used by both pass-through detection and
 * project-prop collection — kept here so the lists never drift apart.
 */
export const STRING_LITERAL_PASS_THROUGHS: ReadonlySet<string> = new Set([
	'ComponentPropsWithRef',
	'ComponentPropsWithoutRef',
	'ComponentProps',
	'PropsWithRef',
	'PropsWithoutRef',
	'PolymorphicProps',
])

/** Whether a type-reference name represents a recognized HTML/React pass-through. */
export function isPassThroughTypeName(name: string): boolean {
	return STRING_LITERAL_PASS_THROUGHS.has(name) || name.endsWith('HTMLAttributes')
}
