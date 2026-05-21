import { ts } from 'ts-morph'
import type { PassThrough } from '../types'
import {
	resolveTypeAliasTarget,
	STRING_LITERAL_PASS_THROUGHS,
	stringLiteralKeys,
	typeRefName,
} from './ts-utils'

/**
 * Walk a component's props-type annotation to detect HTML pass-through. A
 * component passes through `<tag>` attrs when its annotation contains:
 *   - `ComponentPropsWithRef<'tag'>` / `ComponentPropsWithoutRef<'tag'>`
 *   - `*HTMLAttributes<HTMLTagElement>`
 *   - `PolymorphicProps<'tag'>` (project-specific helper)
 */
export function extractPassThrough(
	annotation: ts.TypeNode,
	checker: ts.TypeChecker,
): PassThrough[] {
	const found: PassThrough[] = []
	const visited = new Set<string>()

	walk(annotation, [], found, visited, checker)

	return dedupe(found)
}

function walk(
	node: ts.TypeNode,
	omitted: string[],
	out: PassThrough[],
	visited: Set<string>,
	checker: ts.TypeChecker,
): void {
	// Key by node + omitted context: the same alias reached through different
	// `Omit<…>` wrappers needs to be re-walked so each visit's omitted keys
	// land on its own pass-through entry.
	const key = `${node.getSourceFile().fileName}:${node.pos}:${node.end} ${omitted.join('|')}`

	if (visited.has(key)) return

	visited.add(key)

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
	if (name === 'Omit') {
		const [inner, keys] = node.typeArguments ?? []

		if (inner) walk(inner, [...omitted, ...stringLiteralKeys(keys)], out, visited, checker)

		return
	}

	// Pick narrows the surface; pass-through inside Pick isn't worth surfacing
	// (we'd be claiming pass-through for a tiny slice).
	if (name === 'Pick') return

	const direct = matchDirectPassThrough(name, node.typeArguments ?? [], checker)

	if (direct) {
		out.push({ element: direct, ...(omitted.length > 0 ? { omitted } : {}) })

		return
	}

	// Named type reference — follow the alias and walk its target.
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

/**
 * Class-name stems where the lowercased stem differs from the HTML tag. For
 * the unlisted majority (`HTMLDivElement` → `div`, `HTMLInputElement` →
 * `input`, …) the lowercased stem *is* the tag. Ambiguous classes resolve to
 * the most representative tag — `HTMLHeadingElement` covers h1..h6,
 * `HTMLTableCellElement` covers td and th, `HTMLTableSectionElement` covers
 * tbody/thead/tfoot, `HTMLModElement` covers del/ins, `HTMLQuoteElement`
 * covers q and blockquote.
 */
const HTML_ELEMENT_TAG_OVERRIDES: ReadonlyMap<string, string> = new Map([
	['Anchor', 'a'],
	['BR', 'br'],
	['DList', 'dl'],
	['Heading', 'h1'],
	['HR', 'hr'],
	['Image', 'img'],
	['LI', 'li'],
	['Mod', 'del'],
	['OList', 'ol'],
	['Paragraph', 'p'],
	['Quote', 'blockquote'],
	['TableCaption', 'caption'],
	['TableCell', 'td'],
	['TableCol', 'col'],
	['TableRow', 'tr'],
	['TableSection', 'tbody'],
	['UList', 'ul'],
])

function extractHtmlElementTag(
	node: ts.TypeNode | undefined,
	checker: ts.TypeChecker,
): string | null {
	if (!node) return null

	if (ts.isTypeReferenceNode(node)) {
		const tag = tagFromClassName(typeRefName(node.typeName))

		if (tag) return tag
	}

	const type = checker.getTypeFromTypeNode(node)

	return tagFromClassName(type.getSymbol()?.getName() ?? '')
}

function tagFromClassName(name: string): string | null {
	const match = name.match(/^HTML(\w+)Element$/)

	if (!match?.[1]) return null

	return HTML_ELEMENT_TAG_OVERRIDES.get(match[1]) ?? match[1].toLowerCase()
}

function dedupe(items: PassThrough[]): PassThrough[] {
	const seen = new Map<string, PassThrough>()

	for (const item of items) {
		const existing = seen.get(item.element)

		if (!existing) {
			seen.set(item.element, item)

			continue
		}

		if (item.omitted) {
			existing.omitted = Array.from(new Set([...(existing.omitted ?? []), ...item.omitted]))
		}
	}

	return Array.from(seen.values())
}
