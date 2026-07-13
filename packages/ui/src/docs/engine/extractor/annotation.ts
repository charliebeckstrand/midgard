import ts from 'typescript'
import type { PassThrough } from './schema'
import {
	type FunctionLikeNode,
	isPassThroughTypeName,
	resolveTypeAliasTarget,
	STRING_LITERAL_PASS_THROUGHS,
	stringLiteralKeys,
	typeRefName,
} from './ts-utils'

/** How a component's props annotation partitions: authored props vs. HTML pass-through. */
export type PropSurface = {
	/**
	 * Project-authored prop names — the table rows. `null` when the component has
	 * no props annotation, so prop extraction falls back to its own heuristic.
	 */
	projectNames: ReadonlySet<string> | null

	/** HTML elements whose attributes pass through — the pass-through note. */
	passThrough: PassThrough[]
}

/**
 * Partition a component's props into the authored surface and the HTML
 * pass-through, in one walk of the annotation. The two are complementary halves
 * of the same tree — every arm is either project-authored (a type literal, a
 * `Pick` slice, a resolved object's properties) or a recognized pass-through
 * (`ComponentProps<'tag'>`, `*HTMLAttributes`, `PolymorphicProps<'tag'>`,
 * possibly behind `Omit`/`Extract`/`Exclude` or a project alias) — so walking
 * them together keeps the two in lockstep by construction. A rest spread onto
 * an intrinsic tag in the body (`<button {...props}>`) contributes pass-through
 * the annotation never named.
 */
export function analyzeProps(
	callable: FunctionLikeNode,
	annotation: ts.TypeNode | undefined,
	checker: ts.TypeChecker,
): PropSurface {
	const names = new Set<string>()

	const passThrough: PassThrough[] = []

	if (annotation) walk(annotation, names, passThrough, new Set(), checker)

	for (const element of restSpreadTargets(callable)) passThrough.push({ element })

	return { projectNames: annotation ? names : null, passThrough: dedupe(passThrough) }
}

/** Route each annotation arm to the authored names or the pass-through elements it contributes. */
function walk(
	node: ts.TypeNode,
	names: Set<string>,
	passThrough: PassThrough[],
	visited: Set<ts.Node>,
	checker: ts.TypeChecker,
): void {
	if (visited.has(node)) return

	visited.add(node)

	if (ts.isIntersectionTypeNode(node) || ts.isUnionTypeNode(node)) {
		for (const member of node.types) walk(member, names, passThrough, visited, checker)

		return
	}

	if (ts.isParenthesizedTypeNode(node)) {
		walk(node.type, names, passThrough, visited, checker)

		return
	}

	// Inline type literal: `{ foo: string; bar?: number }` — authored props.
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

	// A recognized HTML/React pass-through surfaces as an element, not a row.
	// `PolymorphicProps` also adds its `href` discriminator, a real authored prop.
	if (isPassThroughTypeName(refName)) {
		if (refName === 'PolymorphicProps') names.add('href')

		const element = matchDirectPassThrough(refName, node.typeArguments ?? [], checker)

		if (element) passThrough.push({ element })

		return
	}

	// Pick narrows to a named slice: those keys are authored props.
	if (refName === 'Pick') {
		for (const key of stringLiteralKeys(node.typeArguments?.[1])) names.add(key)

		return
	}

	// Omit / Extract / Exclude narrow the first argument without changing its
	// element or its remaining props; recurse into it only.
	if (refName === 'Omit' || refName === 'Extract' || refName === 'Exclude') {
		const inner = node.typeArguments?.[0]

		if (inner) walk(inner, names, passThrough, visited, checker)

		return
	}

	// Project alias (`ButtonBaseProps`, `StackProps = FlexProps`, …): inspect the RHS.
	const aliasTarget = resolveTypeAliasTarget(node.typeName, checker)

	if (aliasTarget) {
		// Splittable (intersection / union / parens / literal): recurse into each
		// arm, then the supplied type arguments — a generic alias' RHS is walked
		// with its parameters unbound, so props or pass-throughs handed in through
		// an argument would otherwise never surface.
		if (isSplittable(aliasTarget)) {
			walk(aliasTarget, names, passThrough, visited, checker)

			for (const arg of node.typeArguments ?? []) walk(arg, names, passThrough, visited, checker)

			return
		}

		// A single reference: a pass-through alias emits its element and no name;
		// a project alias chain (`StackProps = FlexProps`) follows.
		if (ts.isTypeReferenceNode(aliasTarget)) {
			walk(aliasTarget, names, passThrough, visited, checker)

			return
		}
	}

	// A mapped / conditional alias or a non-alias reference: its resolved apparent
	// properties are authored props (a pass-through here surfaces no element).
	for (const symbol of checker.getTypeFromTypeNode(node).getProperties()) {
		names.add(symbol.getName())
	}
}

/** Whether an alias' RHS can be recursed into structurally, keeping its arms visible. */
function isSplittable(node: ts.TypeNode): boolean {
	return (
		ts.isIntersectionTypeNode(node) ||
		ts.isUnionTypeNode(node) ||
		ts.isParenthesizedTypeNode(node) ||
		ts.isTypeLiteralNode(node)
	)
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

/** Collapse duplicate pass-through entries by element, first occurrence winning. */
function dedupe(items: PassThrough[]): PassThrough[] {
	const seen = new Map<string, PassThrough>()

	for (const item of items) {
		if (!seen.has(item.element)) seen.set(item.element, item)
	}

	return [...seen.values()]
}
