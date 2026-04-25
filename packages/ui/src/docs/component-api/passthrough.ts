import ts from 'typescript'
import type { ComponentDecl } from './find-components'
import {
	getPropsAnnotation,
	resolveTypeAliasTarget,
	STRING_LITERAL_PASS_THROUGHS,
	stringLiteralKeys,
	typeRefName,
} from './ts-utils'
import type { PassThrough } from './types'

/**
 * Walk a component's props type AST to detect HTML pass-through. A component
 * passes through `<tag>` attrs when its props type contains:
 *   - `ComponentPropsWithRef<'tag'>` / `ComponentPropsWithoutRef<'tag'>`
 *   - `*HTMLAttributes<HTMLTagElement>`
 *   - `PolymorphicProps<'tag'>` (project-specific helper)
 */
export function detectPassThroughs(decl: ComponentDecl, checker: ts.TypeChecker): PassThrough[] {
	const annotation = getPropsAnnotation(decl.callable)

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
	if (STRING_LITERAL_PASS_THROUGHS.has(name)) {
		return extractStringLiteral(typeArgs[0], checker)
	}

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
