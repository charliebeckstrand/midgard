import { ts } from 'ts-morph'
import type { PassThrough } from '../types'
import {
	resolveTypeAliasTarget,
	STRING_LITERAL_PASS_THROUGHS,
	stringLiteralKeys,
	typeRefName,
} from './ts-utils'

/**
 * Detect HTML pass-through in a props-type annotation. A component passes
 * through `<tag>` attrs when the annotation contains:
 *
 *   - `ComponentPropsWithRef<'tag'>` / `ComponentPropsWithoutRef<'tag'>`
 *   - `*HTMLAttributes<HTMLTagElement>`
 *   - `PolymorphicProps<'tag'>` (project helper)
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
	// `Omit<…>` wrappers produces separate pass-through entries, each carrying
	// its own omitted-key set.
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

	// Omit<T, 'a' | 'b'> — recurse, carrying the keys forward.
	if (name === 'Omit') {
		const [inner, keys] = node.typeArguments ?? []

		if (inner) walk(inner, [...omitted, ...stringLiteralKeys(keys)], out, visited, checker)

		return
	}

	// Pick narrows to a slice — not a full pass-through.
	if (name === 'Pick') return

	const direct = matchDirectPassThrough(name, node.typeArguments ?? [], checker)

	if (direct) {
		out.push({ element: direct, ...(omitted.length > 0 ? { omitted } : {}) })

		return
	}

	// Project alias — follow to its RHS and keep walking.
	const target = resolveTypeAliasTarget(node.typeName, checker)

	if (target) walk(target, omitted, out, visited, checker)
}

/** HTML element name for a recognized pass-through type; null otherwise. */
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
 * Class-name stems whose HTML tag differs from the lowercased stem. The
 * unlisted majority (`HTMLDivElement` → `div`, `HTMLInputElement` → `input`,
 * …) falls through to the lowercased stem. Ambiguous classes — `HTMLHeading`
 * covers `h1..h6`, `HTMLTableCell` covers `td` and `th`, `HTMLTableSection`
 * covers `tbody/thead/tfoot`, `HTMLMod` covers `del/ins`, `HTMLQuote`
 * covers `q` and `blockquote` — pick the most representative tag.
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
