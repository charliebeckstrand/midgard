import ts from 'typescript'
import type { PassThrough } from './schema'
import {
	type FunctionLikeNode,
	resolveTypeAliasTarget,
	STRING_LITERAL_PASS_THROUGHS,
	typeRefName,
} from './ts-utils'

/**
 * Detect HTML pass-through for a component. Two complementary signals:
 *
 *   - The props annotation contains a recognized pass-through type —
 *     `ComponentPropsWithRef<'tag'>` / `ComponentPropsWithoutRef<'tag'>`,
 *     `*HTMLAttributes<HTMLTagElement>`, or `PolymorphicProps<'tag'>` —
 *     possibly behind `Omit<…>`, project aliases, or `Extract`/`Exclude`
 *     narrowing.
 *   - The body spreads the first parameter's `...rest` binding onto an
 *     intrinsic JSX tag (`<button {...props}>`), which surfaces that tag's
 *     attrs even when the annotation never names a pass-through type.
 */
export function extractPassThrough(
	callable: FunctionLikeNode,
	annotation: ts.TypeNode | undefined,
	checker: ts.TypeChecker,
): PassThrough[] {
	const found: PassThrough[] = []

	if (annotation) walk(annotation, found, new Set(), checker)

	for (const element of restSpreadTargets(callable)) {
		found.push({ element })
	}

	return dedupe(found)
}

function walk(
	node: ts.TypeNode,
	out: PassThrough[],
	visited: Set<string>,
	checker: ts.TypeChecker,
): void {
	const key = `${node.getSourceFile().fileName}:${node.pos}:${node.end}`

	if (visited.has(key)) return

	visited.add(key)

	if (ts.isIntersectionTypeNode(node) || ts.isUnionTypeNode(node)) {
		for (const member of node.types) walk(member, out, visited, checker)

		return
	}

	if (ts.isParenthesizedTypeNode(node)) {
		walk(node.type, out, visited, checker)

		return
	}

	if (!ts.isTypeReferenceNode(node)) return

	const name = typeRefName(node.typeName)

	// Pick narrows to a slice, not a full pass-through.
	if (name === 'Pick') return

	// Omit / Extract / Exclude narrow the first argument without changing its
	// element; a pass-through inside it survives, so recurse into it only.
	if (name === 'Omit' || name === 'Extract' || name === 'Exclude') {
		const inner = node.typeArguments?.[0]

		if (inner) walk(inner, out, visited, checker)

		return
	}

	const direct = matchDirectPassThrough(name, node.typeArguments ?? [], checker)

	if (direct) {
		out.push({ element: direct })

		return
	}

	// Project alias: follow to its RHS and keep walking.
	const target = resolveTypeAliasTarget(node.typeName, checker)

	if (target) walk(target, out, visited, checker)
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
 * Class-name stems whose HTML tag differs from the lowercased stem. Unlisted
 * stems (`HTMLDivElement` → `div`, `HTMLInputElement` → `input`, …) fall
 * through to the lowercased stem. Ambiguous classes pick the most
 * representative tag: `HTMLHeading` covers `h1..h6`, `HTMLTableCell` covers
 * `td` and `th`, `HTMLTableSection` covers `tbody/thead/tfoot`, `HTMLMod`
 * covers `del/ins`, `HTMLQuote` covers `q` and `blockquote`.
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

/**
 * Intrinsic JSX tags the first parameter's rest binding is spread onto:
 * `function Foo({ a, ...props }) { return <button {...props} /> }` yields
 * `button`. Only a direct spread of the rest identifier (optionally behind
 * parentheses or an `as` cast) counts; renamed or re-derived spreads don't
 * prove the whole surface passes through.
 */
function restSpreadTargets(callable: FunctionLikeNode): string[] {
	const restName = restBindingName(callable)

	if (!restName || !callable.body) return []

	const tags = new Set<string>()

	const visit = (node: ts.Node): void => {
		const tagName = intrinsicTagName(node)

		if (tagName) {
			for (const attr of jsxAttributes(node)) {
				if (!ts.isJsxSpreadAttribute(attr)) continue

				const spread = unwrapExpression(attr.expression)

				if (ts.isIdentifier(spread) && spread.text === restName) tags.add(tagName)
			}
		}

		ts.forEachChild(node, visit)
	}

	visit(callable.body)

	return [...tags]
}

/** Name of the `...rest` element in the first parameter's object binding pattern. */
function restBindingName(callable: FunctionLikeNode): string | null {
	const param = callable.parameters[0]

	if (!param || !ts.isObjectBindingPattern(param.name)) return null

	for (const element of param.name.elements) {
		if (element.dotDotDotToken && ts.isIdentifier(element.name)) return element.name.text
	}

	return null
}

/** Lowercase intrinsic tag name of a JSX element node; null for components and non-JSX nodes. */
function intrinsicTagName(node: ts.Node): string | null {
	let tag: ts.JsxTagNameExpression | null = null

	if (ts.isJsxElement(node)) tag = node.openingElement.tagName

	if (ts.isJsxSelfClosingElement(node)) tag = node.tagName

	if (!tag || !ts.isIdentifier(tag)) return null

	return /^[a-z]/.test(tag.text) ? tag.text : null
}

/** The attribute list of a JSX element or self-closing element. */
function jsxAttributes(node: ts.Node): readonly (ts.JsxAttribute | ts.JsxSpreadAttribute)[] {
	if (ts.isJsxElement(node)) return node.openingElement.attributes.properties

	if (ts.isJsxSelfClosingElement(node)) return node.attributes.properties

	return []
}

/** Strip parentheses and `as` casts around a spread expression. */
function unwrapExpression(node: ts.Expression): ts.Expression {
	let current = node

	while (ts.isParenthesizedExpression(current) || ts.isAsExpression(current)) {
		current = current.expression
	}

	return current
}

function dedupe(items: PassThrough[]): PassThrough[] {
	const seen = new Map<string, PassThrough>()

	for (const item of items) {
		if (!seen.has(item.element)) seen.set(item.element, item)
	}

	return [...seen.values()]
}
