import { ts } from 'ts-morph'
import type { PassThrough } from '../types'
import {
	aliasTarget,
	type Bindings,
	boundStringLiteral,
	componentPropsAnnotation,
	NO_BINDINGS,
	PROPS_WRAPPERS,
	resolveBound,
	stringLiteralKeys,
	TAG_PASS_THROUGHS,
	typeRefName,
} from './ts-utils'

/**
 * Detect HTML pass-through in a props-type annotation. A component passes
 * through `<tag>` attrs when the annotation contains:
 *
 *   - `ComponentProps<'tag'>`, `ComponentPropsWithRef<'tag'>`, or
 *     `ComponentPropsWithoutRef<'tag'>`, whose tag can be a type parameter
 *     that a generic alias binds (`PolymorphicProps<'tag'>`)
 *   - `*HTMLAttributes<HTMLTagElement>`
 *
 * `ComponentProps<typeof X>` reads the props annotation of the component `X`.
 */
export function extractPassThrough(
	annotation: ts.TypeNode,
	checker: ts.TypeChecker,
): PassThrough[] {
	const found: PassThrough[] = []

	walk(annotation, [], NO_BINDINGS, found, new Map(), checker)

	return dedupe(found)
}

function walk(
	annotation: ts.TypeNode,
	omitted: string[],
	scope: Bindings,
	out: PassThrough[],
	visited: Map<Bindings, Set<string>>,
	checker: ts.TypeChecker,
): void {
	const { node, bindings } = resolveBound(annotation, scope, checker)

	// Key by node + omitted context, per bindings: the same alias reached through
	// different `Omit<…>` wrappers produces separate pass-through entries, each
	// carrying its own omitted-key set, and an alias that two references bind
	// differently is walked once for each.
	const key = `${node.getSourceFile().fileName}:${node.pos}:${node.end} ${omitted.join('|')}`

	const seen = visited.get(bindings) ?? new Set<string>()

	if (seen.has(key)) return

	seen.add(key)

	visited.set(bindings, seen)

	const recurse = (next: ts.TypeNode, keys = omitted, nextBindings = bindings) =>
		walk(next, keys, nextBindings, out, visited, checker)

	if (ts.isIntersectionTypeNode(node) || ts.isUnionTypeNode(node)) {
		for (const member of node.types) recurse(member)

		return
	}

	if (ts.isParenthesizedTypeNode(node)) {
		recurse(node.type)

		return
	}

	if (!ts.isTypeReferenceNode(node)) return

	const name = typeRefName(node.typeName)

	const [first, second] = node.typeArguments ?? []

	// Omit<T, 'a' | 'b'>: recurse, carrying the keys forward.
	if (name === 'Omit') {
		if (first) recurse(first, [...omitted, ...stringLiteralKeys(second, bindings, checker)])

		return
	}

	// Pick narrows to a slice, not a full pass-through.
	if (name === 'Pick') return

	if (PROPS_WRAPPERS.has(name)) {
		if (first) recurse(first)

		return
	}

	if (TAG_PASS_THROUGHS.has(name)) {
		const tag = boundStringLiteral(first, bindings, checker)

		if (tag) {
			out.push(passThrough(tag, omitted))

			return
		}

		const component = first && resolveBound(first, bindings, checker).node

		const props = component && componentPropsAnnotation(component, checker)

		if (props) recurse(props, omitted, NO_BINDINGS)

		return
	}

	if (name.endsWith('HTMLAttributes')) {
		const tag = extractHtmlElementTag(first, checker)

		if (tag) out.push(passThrough(tag, omitted))

		return
	}

	// Project alias: follow to its RHS, with its type parameters bound.
	const target = aliasTarget(node, bindings, checker)

	if (target) recurse(target.node, omitted, target.bindings)
}

/** A pass-through of `element`, with each omitted key once. */
function passThrough(element: string, omitted: string[]): PassThrough {
	return omitted.length > 0 ? { element, omitted: [...new Set(omitted)] } : { element }
}

/**
 * Class-name stems whose HTML tag differs from the lowercased stem. Unlisted
 * stems (`HTMLDivElement` → `div`, `HTMLInputElement` → `input`, …) fall
 * through to the lowercased stem.
 *
 * Ambiguous classes pick the most representative tag. `HTMLHeading` covers
 * `h1..h6`, and `HTMLTableCell` covers `td` and `th`. `HTMLTableSection` covers
 * `tbody/thead/tfoot`, `HTMLMod` covers `del/ins`, and `HTMLQuote` covers `q`
 * and `blockquote`.
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
