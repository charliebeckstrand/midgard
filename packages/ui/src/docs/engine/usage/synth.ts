// Turn one extracted symbol into a seeded usage AST. The engine knows a prop's
// checker-classified `shape`, so synthesis is a walk over that structure rather
// than a parse of type text — the extractor already did the parsing at build
// time. Two strategies (component, callable) share one `synthValue` core and a
// small set of safety rules that keep generated code runnable: no controlled
// prop without the state to drive it, no value invented for a type we can't
// read.

import type { CallableApi, ComponentApi, PropDef, SymbolApi, TypeShape } from '../extractor/schema'
import type { Expr, ImportLine, Stmt, UsageDoc } from './ast'
import { KNOBS, type Knobs, type UsageConfig } from './config'
import { makeRng, type Rng } from './prng'
import { fieldNumber, fieldString, label } from './vocab'

/**
 * Controlled-state props: setting one demands external state and a matching
 * handler, which a self-contained snippet has no business fabricating. They are
 * dropped from optional synthesis (a required one is still honored), which is
 * exactly why an uncontrolled `default*` twin — left untouched here — is what
 * gets set instead.
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
 * A component becomes a single JSX element. Required props are always set;
 * optionals are sampled by an up-front threshold draw so inclusion is monotonic
 * across complexity (`minimal ⊆ typical ⊆ rich` for a fixed seed). Array-valued
 * props hoist to a `const` for readability; a component that spreads onto a
 * non-void element gets a text label child.
 */
function componentStrategy(
	component: ComponentApi,
	specifier: string,
	config: UsageConfig,
	seed: number,
): UsageDoc {
	const rng = makeRng(seed)

	const knobs = KNOBS[config.complexity]

	// Optionals we could set: synthesizable, not controlled, not author-excluded.
	const optional = component.props.filter(
		(prop) =>
			!prop.required &&
			!CONTROLLED_PROPS.has(prop.name) &&
			!config.exclude.includes(prop.name) &&
			propShape(prop) !== null,
	)

	// Draw every inclusion threshold before any value, so the included *set* is a
	// pure function of seed + chance and never shifts with what gets synthesized.
	const included = new Set<string>()

	for (const prop of optional) {
		if (rng.chance(knobs.optionalChance)) included.add(prop.name)
	}

	for (const name of config.include) {
		if (!config.exclude.includes(name)) included.add(name)
	}

	// Drawn at a fixed point after the thresholds: stable across complexity.
	const children: Expr[] = takesChildren(component)
		? [{ e: 'text', value: label(config.domain, rng) }]
		: []

	const hoisted: Stmt[] = []

	const attrs = []

	for (const prop of component.props) {
		const use = prop.required ? !config.exclude.includes(prop.name) : included.has(prop.name)

		if (!use) continue

		const shape = propShape(prop)

		const value = shape && synthValue(shape, prop.name, config, rng, knobs, 0)

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

	const knobs = KNOBS[config.complexity]

	const signature = callable.signatures[0]

	const args: Expr[] = []

	for (const param of signature?.params ?? []) {
		const shape = param.shape ?? (param.type ? shapeFromType(param.type) : null)

		const value = shape && synthValue(shape, param.name, config, rng, knobs, 0)

		if (value) args.push(value)
	}

	const call: Expr = { e: 'call', callee: callable.name, args }

	const imports: ImportLine[] = [{ names: [callable.name], from: specifier }]

	if (callable.kind === 'function') return { imports, body: [{ s: 'show', value: call }] }

	const names = pairNames(signature?.returns.type ?? '')

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
 * A value for one shape. Literal unions pick a member, primitives draw
 * name-aware mock data, arrays repeat to the complexity's length, objects
 * recurse over every synthesizable field. Function shapes become a no-op arrow;
 * `react-node` and `opaque` yield `null` — there is nothing safe to invent —
 * and so does anything past {@link MAX_DEPTH}.
 */
function synthValue(
	shape: TypeShape,
	name: string,
	config: UsageConfig,
	rng: Rng,
	knobs: Knobs,
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

			for (let i = 0; i < knobs.arrayLength; i++) {
				const item = synthValue(shape.element, singular(name), config, rng, knobs, depth + 1)

				if (item) items.push(item)
			}

			return { e: 'array', items }
		}

		case 'object': {
			const fields = []

			for (const [key, fieldShape] of Object.entries(shape.fields)) {
				if (CONTROLLED_PROPS.has(key)) continue

				const value = synthValue(fieldShape, key, config, rng, knobs, depth + 1)

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
		if (prop.shape.k === 'react-node') return null

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
 * is a function — the ubiquitous state-hook shape. Anything else returns `null`
 * so the caller binds a plain `const`.
 */
function pairNames(returnType: string): [string, string] | null {
	const trimmed = returnType.trim()

	if (!trimmed.startsWith('[') || !trimmed.endsWith(']')) return null

	const parts = splitTopLevel(trimmed.slice(1, -1))

	if (parts.length !== 2) return null

	return parts[1]?.includes('=>') ? ['value', 'setValue'] : null
}

/** Split on top-level commas, ignoring those nested inside `<>`, `[]`, `{}`, or `()`. */
function splitTopLevel(source: string): string[] {
	const parts: string[] = []

	let depth = 0

	let start = 0

	for (let i = 0; i < source.length; i++) {
		const char = source[i]

		if (char === '<' || char === '[' || char === '{' || char === '(') depth++
		else if (char === '>' || char === ']' || char === '}' || char === ')') depth--
		else if (char === ',' && depth === 0) {
			parts.push(source.slice(start, i))

			start = i + 1
		}
	}

	parts.push(source.slice(start))

	return parts.map((part) => part.trim())
}

/** Naive singularization for array-element field names: `columns` → `column`. */
function singular(name: string): string {
	return name.endsWith('s') ? name.slice(0, -1) : name
}
