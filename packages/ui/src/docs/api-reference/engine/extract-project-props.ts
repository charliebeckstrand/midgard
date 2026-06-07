import { ts } from 'ts-morph'
import {
	isPassThroughTypeName,
	resolveTypeAliasTarget,
	stringLiteralKeys,
	typeRefName,
} from './ts-utils'

/**
 * Names from project-authored arms of a props-type annotation — anything not
 * supplied by a recognized HTML/React pass-through. Determines which props
 * to list in the table vs. surface only through the pass-through note.
 *
 * AST-walked rather than read from `symbol.getDeclarations()`: TS merges
 * intersection properties into a single symbol whose declarations often
 * point only at `@types/react` (e.g. `color` on `<input>`), erasing the
 * project arm that narrowed the type.
 */
export function extractProjectPropNames(
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

	// Inline type literal — `{ foo: string; bar?: number }`.
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

	// Pass-throughs surface via the pass-through note, not the table.
	// `PolymorphicProps` is the exception — its `href` discriminator
	// switches the element to `<a>` and counts as a project-authored prop.
	if (isPassThroughTypeName(refName)) {
		if (refName === 'PolymorphicProps') names.add('href')

		return
	}

	if (refName === 'Omit') {
		const inner = node.typeArguments?.[0]

		if (inner) walk(inner, names, visited, checker)

		return
	}

	if (refName === 'Pick') {
		const [, keys] = node.typeArguments ?? []

		for (const k of stringLiteralKeys(keys)) names.add(k)

		return
	}

	// Extract<T, U> / Exclude<T, U> — recurse into T. U is the narrowing
	// predicate (structural, not a prop source), and skipping the recursion
	// would fan T out into every HTML attr — `aria-*`, `on*`, …
	if (refName === 'Extract' || refName === 'Exclude') {
		const inner = node.typeArguments?.[0]

		if (inner) walk(inner, names, visited, checker)

		return
	}

	// Project alias (`CheckboxVariants`, `ButtonBaseProps`, …) — inspect the RHS:
	//   • Splittable (intersection / union / parens / literal) — recurse so
	//     pass-through arms still get honored.
	//   • Single TypeReference — if it's a pass-through, drop the whole branch
	//     (`type FooProps = ComponentPropsWithoutRef<'div'>`); if it's another
	//     project alias (`BottomNavProps = NavProps`), follow the chain.
	//   • Anything else (mapped / conditional / fn) — fall through to the
	//     resolved-type properties below.
	const aliasTarget = resolveTypeAliasTarget(node.typeName, checker)

	if (aliasTarget) {
		if (isSplittable(aliasTarget)) {
			walk(aliasTarget, names, visited, checker)

			return
		}

		if (ts.isTypeReferenceNode(aliasTarget)) {
			if (isPassThroughTypeName(typeRefName(aliasTarget.typeName))) return

			walk(aliasTarget, names, visited, checker)

			return
		}
	}

	const type = checker.getTypeFromTypeNode(node)

	for (const symbol of type.getProperties()) {
		names.add(symbol.getName())
	}
}

/**
 * Whether an alias' RHS can be recursed into structurally — keeping
 * pass-through arms visible. Single references and mapped / conditional
 * types are excluded: recursing those loses the caller's type-argument
 * bindings (the RHS uses its own parameters).
 */
function isSplittable(node: ts.TypeNode): boolean {
	return (
		ts.isIntersectionTypeNode(node) ||
		ts.isUnionTypeNode(node) ||
		ts.isParenthesizedTypeNode(node) ||
		ts.isTypeLiteralNode(node)
	)
}
