import ts from 'typescript'

/**
 * Walk a props-type annotation and collect the set of property names that
 * come from project-authored arms — i.e. anything that isn't a recognized
 * HTML/React pass-through type. The resolved type's properties are the union
 * of all arms; this set tells us which of them to *list* (vs. document via
 * the pass-through annotation).
 *
 * We can't rely on `symbol.getDeclarations()` alone: TS merges intersection
 * properties into a single symbol whose declarations often point only to
 * `@types/react` (e.g. `color` on `<input>`), losing the project-authored
 * arm that narrowed the type. Walking the annotation AST recovers that.
 */
export function collectProjectPropNames(
	annotation: ts.TypeNode,
	checker: ts.TypeChecker,
): Set<string> {
	const names = new Set<string>()

	const visited = new Set<ts.Node>()

	walk(annotation, names, visited, checker)

	return names
}

function walk(
	node: ts.TypeNode,
	names: Set<string>,
	visited: Set<ts.Node>,
	checker: ts.TypeChecker,
): void {
	if (visited.has(node)) return

	visited.add(node)

	if (ts.isIntersectionTypeNode(node) || ts.isUnionTypeNode(node)) {
		for (const member of node.types) walk(member, names, visited, checker)

		return
	}

	if (ts.isParenthesizedTypeNode(node)) {
		walk(node.type, names, visited, checker)

		return
	}

	// Inline type-literals — `{ foo: string; bar?: number }`
	if (ts.isTypeLiteralNode(node)) {
		for (const member of node.members) {
			if (ts.isPropertySignature(member) && member.name && ts.isIdentifier(member.name)) {
				names.add(member.name.text)
			}
		}
		return
	}

	if (!ts.isTypeReferenceNode(node)) return

	const refName = typeRefName(node.typeName)

	// Recognized pass-throughs — skip entirely; they're surfaced via the
	// pass-through annotation, not as inline props. `PolymorphicProps` is the
	// exception: the polymorphic union also carries `href`, which is a real,
	// project-authored prop (the discriminator that switches to <a>).
	if (isPassThroughTypeName(refName)) {
		if (refName === 'PolymorphicProps') names.add('href')

		return
	}

	// Omit<T, K> — recurse into T (the omitted keys are stripped from the
	// resolved type already; we don't need to re-strip here).
	if (refName === 'Omit' || refName === 'DistributiveOmit') {
		const inner = node.typeArguments?.[0]
		if (inner) walk(inner, names, visited, checker)

		return
	}

	// Pick<T, K> — narrow to listed keys
	if (refName === 'Pick') {
		const [, keys] = node.typeArguments ?? []
		for (const k of stringLiteralKeys(keys)) names.add(k)

		return
	}

	// Project type aliases (CheckboxVariants, ButtonBaseProps, …): inspect the
	// alias' RHS first.
	//   • Splittable shapes (intersection / union / parens / literal) — recurse
	//     so we keep honoring pass-through arms instead of inlining HTML attrs.
	//   • Single TypeReference RHS — peek at it: if it's a pass-through (e.g.
	//     `type FooProps = ComponentPropsWithoutRef<'div'>`), skip the whole
	//     branch. Otherwise fall through to resolved-type properties on the
	//     original node (avoids losing type-arg context across alias hops).
	//   • Anything else (mapped / conditional / fn) — resolved-type fallback.
	const aliasTarget = resolveTypeAliasTarget(node.typeName, checker)

	if (aliasTarget) {
		if (isSplittable(aliasTarget)) {
			walk(aliasTarget, names, visited, checker)

			return
		}

		if (
			ts.isTypeReferenceNode(aliasTarget) &&
			isPassThroughTypeName(typeRefName(aliasTarget.typeName))
		) {
			return
		}
	}

	const type = checker.getTypeFromTypeNode(node)

	for (const symbol of type.getProperties()) {
		names.add(symbol.getName())
	}
}

/**
 * Whether an alias' RHS is structurally splittable — i.e. recursing keeps
 * the visible structure intact so we can detect pass-through arms. For
 * single type references and mapped / conditional types, recursion would
 * lose type-argument bindings (the alias' RHS uses its own type parameters,
 * not the caller's). Handle those shapes via a different branch.
 */
function isSplittable(node: ts.TypeNode): boolean {
	return (
		ts.isIntersectionTypeNode(node) ||
		ts.isUnionTypeNode(node) ||
		ts.isParenthesizedTypeNode(node) ||
		ts.isTypeLiteralNode(node)
	)
}

/** Follow a type-name reference to its `type X = …` RHS, if any. */
function resolveTypeAliasTarget(name: ts.EntityName, checker: ts.TypeChecker): ts.TypeNode | null {
	const symbol = checker.getSymbolAtLocation(ts.isIdentifier(name) ? name : name.right)

	if (!symbol) return null

	const aliased = symbol.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(symbol) : symbol

	for (const decl of aliased.getDeclarations() ?? []) {
		if (ts.isTypeAliasDeclaration(decl)) return decl.type
	}

	return null
}

function isPassThroughTypeName(name: string): boolean {
	return (
		name === 'ComponentPropsWithRef' ||
		name === 'ComponentPropsWithoutRef' ||
		name === 'ComponentProps' ||
		name === 'PropsWithRef' ||
		name === 'PropsWithoutRef' ||
		name === 'PolymorphicProps' ||
		name.endsWith('HTMLAttributes')
	)
}

function typeRefName(name: ts.EntityName): string {
	if (ts.isIdentifier(name)) return name.text
	return `${typeRefName(name.left)}.${name.right.text}`
}

function stringLiteralKeys(node: ts.TypeNode | undefined): string[] {
	if (!node) return []

	if (ts.isLiteralTypeNode(node) && ts.isStringLiteral(node.literal)) return [node.literal.text]

	if (ts.isUnionTypeNode(node)) return node.types.flatMap((t) => stringLiteralKeys(t))

	return []
}
