import { ts } from 'ts-morph'
import {
	aliasTarget,
	type Bindings,
	componentPropsAnnotation,
	isPassThroughTypeName,
	NO_BINDINGS,
	PROPS_WRAPPERS,
	resolveBound,
	stringLiteralKeys,
	TAG_PASS_THROUGHS,
	typeRefName,
} from './ts-utils'

/**
 * Names from project-authored arms of a props-type annotation: anything not
 * supplied by a recognized HTML/React pass-through. Determines which props
 * appear in the table vs. the pass-through note.
 *
 * Walks the AST rather than reading `symbol.getDeclarations()`: TS merges
 * intersection properties into a single symbol whose declarations can point
 * only at `@types/react` (e.g. `color` on `<input>`), erasing the project arm
 * that narrowed the type.
 *
 * The set keeps the order in which the annotation spells the names, arm by
 * arm, and the prop table uses that order. The checker's order is not stable.
 * `Omit` and `Pick` order their keys by type id, and the ids change with the
 * files that a pass reads first. The walk reads the checker's order only for
 * a type that it cannot split, such as a recipe's `VariantProps`. That mapped
 * type iterates the keys of the recipe config, so its order is the order of
 * the source.
 */
export function extractProjectPropNames(
	annotation: ts.TypeNode,
	checker: ts.TypeChecker,
): Set<string> {
	const names = new Set<string>()

	walk(annotation, NO_BINDINGS, names, new Map(), checker)

	return names
}

function walk(
	annotation: ts.TypeNode,
	scope: Bindings,
	names: Set<string>,
	visited: Map<Bindings, Set<ts.Node>>,
	checker: ts.TypeChecker,
): void {
	const { node, bindings } = resolveBound(annotation, scope, checker)

	// Per bindings: an alias that two references bind differently is walked
	// once for each.
	const seen = visited.get(bindings) ?? new Set<ts.Node>()

	if (seen.has(node)) return

	seen.add(node)

	visited.set(bindings, seen)

	const recurse = (next: ts.TypeNode, nextBindings = bindings) =>
		walk(next, nextBindings, names, visited, checker)

	if (ts.isIntersectionTypeNode(node) || ts.isUnionTypeNode(node)) {
		for (const member of node.types) recurse(member)

		return
	}

	if (ts.isParenthesizedTypeNode(node)) {
		recurse(node.type)

		return
	}

	// Inline type literal: `{ foo: string; 'aria-label'?: string; onOpen(): void }`.
	if (ts.isTypeLiteralNode(node)) {
		for (const member of node.members) {
			if (!ts.isPropertySignature(member) && !ts.isMethodSignature(member)) continue

			if (ts.isIdentifier(member.name) || ts.isStringLiteral(member.name)) {
				names.add(member.name.text)
			}
		}

		return
	}

	if (!ts.isTypeReferenceNode(node)) return

	const refName = typeRefName(node.typeName)

	const [first, second] = node.typeArguments ?? []

	if (PROPS_WRAPPERS.has(refName)) {
		if (first) recurse(first)

		return
	}

	// `ComponentProps<typeof X>` takes the props of the component `X`, so its
	// project arms are names here.
	if (TAG_PASS_THROUGHS.has(refName) && first) {
		const props = componentPropsAnnotation(resolveBound(first, bindings, checker).node, checker)

		if (props) {
			recurse(props, NO_BINDINGS)

			return
		}
	}

	// Pass-throughs surface via the pass-through note, not the table.
	if (isPassThroughTypeName(refName)) return

	// `Omit<T, K>`: the names of `T`, less the keys of `K`. A later arm that
	// declares an omitted name again adds it in its own place.
	if (refName === 'Omit') {
		if (!first) return

		const kept = new Set<string>()

		walk(first, bindings, kept, visited, checker)

		const omitted = new Set(stringLiteralKeys(second, bindings, checker))

		for (const name of kept) if (!omitted.has(name)) names.add(name)

		return
	}

	if (refName === 'Pick') {
		for (const k of stringLiteralKeys(second, bindings, checker)) names.add(k)

		return
	}

	// Extract<T, U> / Exclude<T, U>: recurse into T only. U is a narrowing
	// predicate, not a prop source; recursing it fans T out into every HTML
	// attr (`aria-*`, `on*`, …).
	if (refName === 'Extract' || refName === 'Exclude') {
		if (first) recurse(first)

		return
	}

	// Project alias (`CheckboxVariants`, `ButtonBaseProps`, …): inspect the RHS,
	// with the alias's type parameters bound to the reference's arguments:
	//   • Splittable (intersection / union / parens / literal): recurse into
	//     each arm, detecting pass-through arms.
	//   • Single TypeReference: drop the branch if it's a pass-through
	//     (`type FooProps = ComponentPropsWithoutRef<'div'>`); follow the chain
	//     if it's another project alias (`StackProps = FlexProps`).
	//   • Anything else (mapped / conditional / fn): fall through to the
	//     resolved-type properties below.
	const target = aliasTarget(node, bindings, checker)

	if (target && (isSplittable(target.node) || ts.isTypeReferenceNode(target.node))) {
		recurse(target.node, target.bindings)

		return
	}

	const type = checker.getTypeFromTypeNode(node)

	for (const symbol of type.getProperties()) {
		names.add(symbol.getName())
	}
}

/**
 * Whether an alias' RHS can be recursed into structurally, keeping
 * pass-through arms visible. Single references and mapped / conditional types
 * are not splittable: their RHS uses its own type-parameter bindings, not the
 * caller's.
 */
function isSplittable(node: ts.TypeNode): boolean {
	return (
		ts.isIntersectionTypeNode(node) ||
		ts.isUnionTypeNode(node) ||
		ts.isParenthesizedTypeNode(node) ||
		ts.isTypeLiteralNode(node)
	)
}
