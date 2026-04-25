import ts from 'typescript'
import type { ComponentDecl } from './find-components'
import type { PassThrough } from './types'

/**
 * Walk a component's props type AST to detect HTML pass-through. A component
 * passes through `<tag>` attrs when its props type contains:
 *   - `ComponentPropsWithRef<'tag'>` / `ComponentPropsWithoutRef<'tag'>`
 *   - `*HTMLAttributes<HTMLTagElement>`
 *   - `PolymorphicProps<'tag'>` (project-specific helper)
 */
export function detectPassThroughs(decl: ComponentDecl, checker: ts.TypeChecker): PassThrough[] {
	const annotation = getPropsTypeNode(decl.callable)

	if (!annotation) return []

	const found: PassThrough[] = []

	const visited = new Set<ts.Node>()

	walk(annotation, [], found, visited, checker)

	return dedupe(found)
}

function walk(
	node: ts.TypeNode,
	omitted: string[],
	out: PassThrough[],
	visited: Set<ts.Node>,
	checker: ts.TypeChecker,
): void {
	if (visited.has(node)) return

	visited.add(node)

	// Intersection / union — walk each member
	if (ts.isIntersectionTypeNode(node) || ts.isUnionTypeNode(node)) {
		for (const member of node.types) walk(member, omitted, out, visited, checker)

		return
	}

	if (ts.isParenthesizedTypeNode(node)) {
		walk(node.type, omitted, out, visited, checker)

		return
	}

	if (!ts.isTypeReferenceNode(node)) return

	const name = typeRefName(node.typeName)

	// Omit<T, 'a' | 'b'> — recurse with extra omitted keys
	if (name === 'Omit' || name === 'DistributiveOmit') {
		const [inner, keys] = node.typeArguments ?? []

		if (inner) walk(inner, [...omitted, ...stringLiteralKeys(keys)], out, visited, checker)

		return
	}

	if (name === 'Pick') {
		// Pick narrows the surface; pass-through detection inside Pick is
		// usually not what the user wants to surface (we'd be claiming
		// pass-through for a tiny slice). Skip.
		return
	}

	// Pass-through types we recognize directly
	const direct = matchDirectPassThrough(name, node.typeArguments ?? [], checker)

	if (direct) {
		out.push({ element: direct, ...(omitted.length > 0 ? { omitted } : {}) })

		return
	}

	// Named type reference — follow the alias and walk its target
	const target = resolveTypeAliasTarget(node.typeName, checker)

	if (target) walk(target, omitted, out, visited, checker)
}

/**
 * Match the recognized pass-through type names. Returns the HTML element name
 * (e.g. `'input'`, `'div'`) when matched, otherwise null.
 */
function matchDirectPassThrough(
	name: string,
	typeArgs: readonly ts.TypeNode[],
	checker: ts.TypeChecker,
): string | null {
	// ComponentPropsWith[out]Ref<'tag'>
	if (
		name === 'ComponentPropsWithRef' ||
		name === 'ComponentPropsWithoutRef' ||
		name === 'ComponentProps' ||
		name === 'PropsWithRef' ||
		name === 'PropsWithoutRef'
	) {
		return extractStringLiteral(typeArgs[0], checker)
	}

	// PolymorphicProps<'tag'> — project-specific
	if (name === 'PolymorphicProps') {
		return extractStringLiteral(typeArgs[0], checker)
	}

	// *HTMLAttributes<HTMLXElement>
	if (name.endsWith('HTMLAttributes')) {
		return extractHtmlElementTag(typeArgs[0], checker)
	}

	return null
}

/** Extract the underlying string-literal value from a type node (e.g. `'input'` → "input"). */
function extractStringLiteral(
	node: ts.TypeNode | undefined,
	checker: ts.TypeChecker,
): string | null {
	if (!node) return null

	if (ts.isLiteralTypeNode(node) && ts.isStringLiteral(node.literal)) return node.literal.text

	const type = checker.getTypeFromTypeNode(node)

	if (type.isStringLiteral()) return type.value

	return null
}

/** Extract an HTML element tag from `HTMLDivElement` / `HTMLButtonElement` style references. */
function extractHtmlElementTag(
	node: ts.TypeNode | undefined,
	checker: ts.TypeChecker,
): string | null {
	if (!node) return 'element'

	if (ts.isTypeReferenceNode(node)) {
		const name = typeRefName(node.typeName)

		const match = name.match(/^HTML(\w+)Element$/)

		if (match?.[1]) return match[1].toLowerCase()
	}

	const type = checker.getTypeFromTypeNode(node)

	const symbolName = type.getSymbol()?.getName() ?? ''

	const match = symbolName.match(/^HTML(\w+)Element$/)

	return match?.[1]?.toLowerCase() ?? null
}

/** Get the dot-separated name from a TypeName — `Foo` or `Foo.Bar`. */
function typeRefName(name: ts.EntityName): string {
	if (ts.isIdentifier(name)) return name.text

	return `${typeRefName(name.left)}.${name.right.text}`
}

function stringLiteralKeys(node: ts.TypeNode | undefined): string[] {
	if (!node) return []

	if (ts.isLiteralTypeNode(node) && ts.isStringLiteral(node.literal)) return [node.literal.text]

	if (ts.isUnionTypeNode(node)) {
		return node.types.flatMap((t) => stringLiteralKeys(t))
	}

	return []
}

/** Resolve a type alias reference to the AST node of its definition's RHS. */
function resolveTypeAliasTarget(name: ts.EntityName, checker: ts.TypeChecker): ts.TypeNode | null {
	const symbol = checker.getSymbolAtLocation(ts.isIdentifier(name) ? name : name.right)

	if (!symbol) return null

	const aliased = symbol.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(symbol) : symbol

	for (const decl of aliased.getDeclarations() ?? []) {
		if (ts.isTypeAliasDeclaration(decl)) return decl.type

		// For interfaces, walking members is more complex; pass-through is rare in interfaces
		// and we don't surface them yet. Could add later.
	}

	return null
}

/** Get the type annotation node of the first parameter of a component callable. */
function getPropsTypeNode(callable: ts.Node): ts.TypeNode | null {
	const fn = unwrapToFunctionLike(callable)

	if (!fn) return null

	const param = fn.parameters[0]

	return param?.type ?? null
}

function unwrapToFunctionLike(node: ts.Node): ts.SignatureDeclaration | null {
	if (ts.isFunctionDeclaration(node) || ts.isFunctionExpression(node) || ts.isArrowFunction(node)) {
		return node
	}

	if (ts.isCallExpression(node)) {
		for (const arg of node.arguments) {
			const fn = unwrapToFunctionLike(arg)

			if (fn) return fn
		}
	}

	return null
}

function dedupe(items: PassThrough[]): PassThrough[] {
	const seen = new Map<string, PassThrough>()

	for (const item of items) {
		const existing = seen.get(item.element)

		if (!existing) {
			seen.set(item.element, item)

			continue
		}

		// Merge omitted keys when the same element appears multiple times
		if (item.omitted) {
			existing.omitted = Array.from(new Set([...(existing.omitted ?? []), ...item.omitted]))
		}
	}

	return Array.from(seen.values())
}
