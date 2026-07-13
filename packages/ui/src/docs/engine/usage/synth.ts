// Turn one extracted symbol into a usage AST. The engine knows a prop's
// checker-classified `shape`, so synthesis is a walk over that structure rather
// than a parse of type text — the extractor already did the parsing at build
// time. One autonomous mode: required props (and anything the author names in
// `include`) on the component's own defaults, plus synthesized text for the
// text-bearing slots. Reproducible from `seed`.

import type { CallableApi, ComponentApi, PropDef, SymbolApi, TypeShape } from '../extractor/schema'
import type { Expr, ImportLine, Stmt, UsageDoc } from './ast'
import type { UsageConfig } from './config'
import { makeRng, type Rng } from './prng'
import { fieldNumber, fieldString, label } from './vocab'

/**
 * Controlled-state props: setting one demands external state and a matching
 * handler, which a self-contained snippet has no business fabricating. Never set
 * autonomously — a component's uncontrolled `default*` twin is what gets set
 * instead — though an author's explicit `include` still forces one on.
 */
const CONTROLLED_PROPS: ReadonlySet<string> = new Set([
	'value',
	'checked',
	'open',
	'selected',
	'expanded',
	'pressed',
	'active',
])

/**
 * React-node props that read as text, so a plain string is the right content
 * (an Alert's `title`, a Field's `description`). Element-bearing nodes — `icon`,
 * `prefix`, `actions` — are absent by design and stay unset: there is no safe
 * element to invent for them.
 */
const TEXT_NODE_PROPS: ReadonlySet<string> = new Set([
	'title',
	'description',
	'label',
	'heading',
	'subheading',
	'subtitle',
	'message',
	'caption',
	'summary',
	'text',
	'content',
	'body',
	'name',
	'placeholder',
	'hint',
])

/** HTML elements that never take children; a component spreading onto one is self-closing. */
const VOID_ELEMENTS: ReadonlySet<string> = new Set([
	'input',
	'img',
	'br',
	'hr',
	'area',
	'base',
	'col',
	'embed',
	'link',
	'meta',
	'param',
	'source',
	'track',
	'wbr',
])

/** Length of a synthesized array value; one item keeps the basic example short. */
const ARRAY_LENGTH = 1

/** Deepest object/array nesting synthesized before a value degrades to omitted. */
const MAX_DEPTH = 3

/** Synthesize a usage example for one symbol, reproducible from `seed`. */
export function synthesize(
	symbol: SymbolApi,
	specifier: string,
	config: UsageConfig,
	seed: number,
): UsageDoc {
	if (symbol.kind === 'component') return componentStrategy(symbol, specifier, config, seed)

	if (symbol.kind === 'hook' || symbol.kind === 'function') {
		return callableStrategy(symbol, specifier, config, seed)
	}

	// An unmodeled `other` export: show the bare identifier so the tab still
	// renders something honest rather than an error.
	return {
		imports: [{ names: [symbol.name], from: specifier }],
		body: [{ s: 'show', value: { e: 'ident', name: symbol.name } }],
	}
}

/**
 * A component becomes a single JSX element on its own defaults: required props
 * and text-bearing content slots are set, other optionals are left to default
 * unless the author `include`s them, and a component that renders children gets
 * a text label. Array-valued props hoist to a `const` for readability.
 */
function componentStrategy(
	component: ComponentApi,
	specifier: string,
	config: UsageConfig,
	seed: number,
): UsageDoc {
	const rng = makeRng(seed)

	const included = new Set(config.include)

	const children: Expr[] = takesChildren(component)
		? [{ e: 'text', value: label(config.domain, rng) }]
		: []

	const hoisted: Stmt[] = []

	const attrs = []

	for (const prop of component.props) {
		if (prop.name === 'children' || config.exclude.includes(prop.name)) continue

		// Set required props, anything the author includes, and the text-bearing
		// content slots — so a component whose content is all optional (an Alert's
		// title and description) still renders text rather than empty chrome.
		if (!(prop.required || included.has(prop.name) || isContentNode(prop))) continue

		const value = synthProp(prop, config, rng)

		if (!value) continue

		if (value.e === 'bool' && value.value) {
			attrs.push({ name: prop.name, value: null })
		} else if (value.e === 'array') {
			hoisted.push({ s: 'const', name: prop.name, value })

			attrs.push({ name: prop.name, value: { e: 'ident', name: prop.name } as Expr })
		} else {
			attrs.push({ name: prop.name, value })
		}
	}

	let show: Expr = { e: 'jsx', tag: component.name, attrs, children }

	for (const provider of config.wrap)
		show = { e: 'jsx', tag: provider, attrs: [], children: [show] }

	return {
		imports: buildImports(specifier, component.name, config.wrap),
		body: [...hoisted, { s: 'show', value: show }],
	}
}

/**
 * A hook or function becomes a call. Arguments synthesize from each parameter's
 * shape; a hook that returns a `[value, setValue]` pair destructures it, other
 * hooks bind `const result`, and a plain function stands as the showcase
 * expression.
 */
function callableStrategy(
	callable: CallableApi,
	specifier: string,
	config: UsageConfig,
	seed: number,
): UsageDoc {
	const rng = makeRng(seed)

	const signature = callable.signatures[0]

	const args: Expr[] = []

	for (const param of signature?.params ?? []) {
		const shape = param.shape ?? (param.type ? shapeFromType(param.type) : null)

		const value = shape && synthValue(shape, param.name, config, rng, 0)

		if (value) args.push(value)
	}

	const call: Expr = { e: 'call', callee: callable.name, args }

	const imports: ImportLine[] = [{ names: [callable.name], from: specifier }]

	if (callable.kind === 'function') return { imports, body: [{ s: 'show', value: call }] }

	const names = pairNames(signature?.returns.shape)

	return {
		imports,
		body: [
			names
				? { s: 'destructure', names, value: call }
				: { s: 'const', name: 'result', value: call },
		],
	}
}

/**
 * The value for one prop. A text-bearing react-node ({@link TEXT_NODE_PROPS})
 * becomes synthesized copy; everything else walks its checker shape, or `null`
 * when there is nothing safe to invent — an element-bearing node, an opaque type.
 */
function synthProp(prop: PropDef, config: UsageConfig, rng: Rng): Expr | null {
	if (prop.shape?.k === 'react-node') {
		return TEXT_NODE_PROPS.has(prop.name.toLowerCase())
			? { e: 'str', value: fieldString(prop.name, config.domain, rng) }
			: null
	}

	const shape = propShape(prop)

	return shape ? synthValue(shape, prop.name, config, rng, 0) : null
}

/** A text-bearing react-node prop — a component's own content, filled even when optional. */
function isContentNode(prop: PropDef): boolean {
	return prop.shape?.k === 'react-node' && TEXT_NODE_PROPS.has(prop.name.toLowerCase())
}

/**
 * A value for one shape. Literal unions pick a member, primitives draw
 * name-aware mock data, arrays hold one element, objects recurse over every
 * synthesizable field. Function shapes become a no-op arrow; anything past
 * {@link MAX_DEPTH}, and any node/opaque shape, yields `null`.
 */
function synthValue(
	shape: TypeShape,
	name: string,
	config: UsageConfig,
	rng: Rng,
	depth: number,
): Expr | null {
	if (depth > MAX_DEPTH) return null

	switch (shape.k) {
		case 'literal-union':
			return literalExpr(rng.pick(shape.members))

		case 'primitive':
			if (shape.name === 'string') return { e: 'str', value: fieldString(name, config.domain, rng) }

			if (shape.name === 'number') return { e: 'num', value: fieldNumber(name, rng) }

			return { e: 'bool', value: true }

		case 'array': {
			const items: Expr[] = []

			for (let i = 0; i < ARRAY_LENGTH; i++) {
				const item = synthValue(shape.element, singular(name), config, rng, depth + 1)

				if (item) items.push(item)
			}

			return { e: 'array', items }
		}

		case 'tuple': {
			const items: Expr[] = []

			for (const element of shape.elements) {
				const item = synthValue(element, name, config, rng, depth + 1)

				if (item) items.push(item)
			}

			return { e: 'array', items }
		}

		case 'object': {
			const fields = []

			for (const [key, fieldShape] of Object.entries(shape.fields)) {
				if (CONTROLLED_PROPS.has(key)) continue

				const value = synthValue(fieldShape, key, config, rng, depth + 1)

				if (value) fields.push({ key, value })
			}

			return { e: 'object', fields }
		}

		case 'fn':
			return { e: 'arrow' }

		default:
			return null
	}
}

/**
 * The synthesizable shape of a prop, or `null`. Falls back to reading the type
 * text when the checker left no shape — multi-arm props like a `'a' | 'b' |
 * string` color axis carry no single structure, yet their literal members are
 * right there in the source expression.
 */
function propShape(prop: PropDef): TypeShape | null {
	if (prop.shape) {
		if (prop.shape.k === 'opaque') return shapeFromType(prop.type)

		return prop.shape
	}

	return shapeFromType(prop.type)
}

/**
 * A last-resort shape read straight from type text: the exact primitives, or a
 * union with any string literals in it (`'sm' | 'md' | string` → those two).
 * Anything else stays unsynthesizable. Only consulted when the checker gave no
 * shape, so it never overrides real classification.
 */
function shapeFromType(type: string): TypeShape | null {
	const trimmed = type.trim()

	if (trimmed === 'boolean') return { k: 'primitive', name: 'boolean' }

	if (trimmed === 'string') return { k: 'primitive', name: 'string' }

	if (trimmed === 'number') return { k: 'primitive', name: 'number' }

	const literals = [...trimmed.matchAll(/'([^']*)'/g)].map((match) => match[1] as string)

	return literals.length > 0 ? { k: 'literal-union', members: literals } : null
}

/** A JS literal expression for a union member. */
function literalExpr(member: string | number | boolean): Expr {
	if (typeof member === 'number') return { e: 'num', value: member }

	if (typeof member === 'boolean') return { e: 'bool', value: member }

	return { e: 'str', value: member }
}

/** Whether a component renders children: it spreads onto at least one non-void element. */
function takesChildren(component: ComponentApi): boolean {
	return (component.passThrough ?? []).some((entry) => !VOID_ELEMENTS.has(entry.element))
}

/** The import lines for the symbol and any wrapper providers (imported from the package root). */
function buildImports(specifier: string, name: string, wrap: string[]): ImportLine[] {
	const imports: ImportLine[] = [{ names: [name], from: specifier }]

	if (wrap.length > 0) imports.push({ names: [...wrap], from: packageRoot(specifier) })

	return imports
}

/** `ui/button` → `ui`; `@scope/pkg/sub` → `@scope/pkg`. */
function packageRoot(specifier: string): string {
	const parts = specifier.split('/')

	if (specifier.startsWith('@')) return parts.slice(0, 2).join('/')

	return parts[0] ?? specifier
}

/**
 * `[value, setValue]` names for a two-element tuple return whose second member
 * is a function — the ubiquitous state-hook shape. The checker already
 * classified the return, so this reads the structure rather than parsing the
 * type text; anything else returns `null` so the caller binds a plain `const`.
 */
function pairNames(shape: TypeShape | undefined): [string, string] | null {
	return shape?.k === 'tuple' && shape.elements.length === 2 && shape.elements[1]?.k === 'fn'
		? ['value', 'setValue']
		: null
}

/** Naive singularization for array-element field names: `columns` → `column`. */
function singular(name: string): string {
	return name.endsWith('s') ? name.slice(0, -1) : name
}
