import { ts } from 'ts-morph'

/** Dot-joined name of a TypeName — `Foo`, `Foo.Bar`, `Foo.Bar.Baz`. */
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

/**
 * Pass-through type names whose first type argument is a string-literal tag
 * (`'div'`, `'button'`, …). Shared between pass-through detection and
 * project-prop collection so the two lists never drift.
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
