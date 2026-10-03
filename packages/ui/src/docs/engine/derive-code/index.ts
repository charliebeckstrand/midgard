import { Children, isValidElement, type ReactElement, type ReactNode } from 'react'
import { reindent } from './indent'
import {
	addImport,
	assemble,
	classifyElement,
	closePulledDecls,
	collectChildItems,
	createContext,
	elementChildren,
	formatProps,
	hoistSnippet,
	INDENT,
	matchElementFact,
	PLACEHOLDER,
	registerFactText,
	renderOpenTag,
	resolvePreamble,
} from './internals'
import { defaultRegistry } from './registry'
import type { ComponentRegistry, Context, ElementFact, HelperSnippet, SourceFacts } from './types'

export { defaultRegistry } from './registry'
export type {
	ComponentInfo,
	ComponentRegistry,
	Context,
	DeclarationFact,
	ElementFact,
	ImportFact,
	SourceFacts,
} from './types'

/**
 * Walk a React children tree and produce a simplified code block showing how
 * to use the components on display.
 *
 * - Styling wrappers (divs, spans, Fragments) flatten away.
 * - Pure text/number children collapse to `...`.
 * - Runs of 3+ identical sibling renders collapse to a single representative.
 * - Imports come from build-time component tags; external components (e.g.
 *   lucide icons) resolve by `displayName` against the demos' package imports.
 *
 * `facts` — build-time source knowledge injected by the docs plugin — lets the
 * walk synthesize what runtime values can't express:
 *
 * - props with no literal form (handlers, hook results, data configs) render as
 *   their authored source;
 * - render-prop children emit verbatim;
 * - the declarations those snippets reference (`useState` lines, format
 *   helpers, data consts) assemble into a preamble between the imports and the
 *   JSX.
 *
 * A demo-local helper prints as `<Helper …props />`, and its declarations
 * print once above the JSX. When the helper is all the Example renders, the
 * block holds its declarations alone.
 *
 * Live primitive values still win, so control-driven demos keep reflecting
 * their current state.
 *
 * Returns `null` when the subtree contains no recognized components; the
 * caller then provides an explicit `code` override or omits the code block.
 *
 * `registry` defaults to the build-time {@link defaultRegistry}; tests inject a
 * synthetic one to exercise the agnostic engine without scanning a real library
 * (and without module-mocking `virtual:component-modules`).
 */
export function deriveCode(
	children: ReactNode,
	registry: ComponentRegistry = defaultRegistry,
	facts?: SourceFacts,
): string | null {
	const context = createContext(registry, facts)

	const nodes = Children.toArray(children)

	const sole = soleSnippet(nodes, registry)

	if (sole) {
		hoistSnippet(sole, context)

		return context.imports.size === 0 ? null : assemble(context, '')
	}

	if (facts) countRendered(nodes, registry, context.rendered)

	let jsx = renderNodes(nodes, context, '')

	if (context.imports.size === 0) return null

	// The consistency rule keys on declarations already pulled, but a pull can
	// happen after the prop that must honor it renders (`<Odometer
	// value={value} />` before the `<Button onClick={() => setValue(…)}>` that
	// pulls the pair). A second walk sees the full pull set; it can only turn
	// live values into source identifiers, never pull further, so it converges.
	if (context.pulledDecls.size > 0) {
		// A pulled declaration can pull another, so the second walk sees the closure.
		closePulledDecls(context)

		context.matched.clear()

		jsx = renderNodes(nodes, context, '')
	}

	const preamble = resolvePreamble(context)

	return assemble(context, jsx, preamble)
}

/**
 * Whether {@link deriveCode} would produce anything for this subtree — that is,
 * whether anything in it registers an import.
 *
 * `deriveCode` returns `null` exactly when its walk collected no imports, so
 * finding one element that contributes answers the question. This
 * short-circuits there instead of rendering the whole JSX string, resolving a
 * preamble, and possibly walking a second pass for the consistency rule.
 *
 * Both walks sort an element through {@link classifyElement}, so neither
 * restates the other's rule. A recognized component imports itself. An
 * unrecognized one renders its children in its place, so the walk descends.
 * Without children it stands for its build-time snippet, which contributes
 * when its import table has an entry — the case a demo-local helper rests on,
 * as in `<Example><ClosableExample /></Example>`.
 *
 * @remarks
 * Element-valued props and {@link SourceFacts} need no case of their own.
 * `renderElement` reads both only from an element it has already recognized,
 * which answers `true` on its own.
 */
export function hasDerivableCode(
	children: ReactNode,
	registry: ComponentRegistry = defaultRegistry,
): boolean {
	const stack: ReactNode[] = Children.toArray(children)

	while (stack.length > 0) {
		const node = stack.pop()

		if (!isValidElement(node)) continue

		const classified = classifyElement(node, registry)

		if (classified.kind === 'recognized') return true

		if (classified.kind === 'snippet') {
			if (Object.keys(classified.snippet.imports).length > 0) return true

			continue
		}

		if (classified.kind === 'none') continue

		// Not `push(...nodes)`: a spread passes each entry as an argument and
		// blows the call-argument ceiling on a large array.
		for (const child of classified.nodes) stack.push(child)
	}

	return false
}

/**
 * The helper snippet that the whole tree renders, when the tree renders one
 * helper and nothing beside it. An unrecognized element with children passes
 * through to them, as in the walk.
 */
function soleSnippet(nodes: ReactNode[], registry: ComponentRegistry): HelperSnippet | null {
	const [item, ...rest] = collectChildItems(nodes)

	if (item?.kind !== 'element' || rest.length > 0) return null

	const classified = classifyElement(item.value, registry)

	if (classified.kind === 'snippet') return classified.snippet

	return classified.kind === 'children' ? soleSnippet(classified.nodes, registry) : null
}

/**
 * Count the elements of each tag that the walk renders into `counts`: each
 * recognized element and each helper. It follows the walk's cases, so
 * {@link matchElementFact} can pair the k-th element of a tag with the k-th
 * fact of that tag.
 */
function countRendered(
	nodes: ReactNode[],
	registry: ComponentRegistry,
	counts: Map<string, number>,
): void {
	for (const item of collectChildItems(nodes)) {
		if (item.kind !== 'element') continue

		const classified = classifyElement(item.value, registry)

		if (classified.kind === 'children') {
			countRendered(classified.nodes, registry, counts)

			continue
		}

		if (classified.kind === 'none') continue

		const name = classified.kind === 'snippet' ? classified.snippet.name : classified.info.name

		counts.set(name, (counts.get(name) ?? 0) + 1)

		// A helper renders no children of its own, and a render-prop child is no
		// element, so only a recognized element's children count.
		if (classified.kind === 'recognized') {
			countRendered(elementChildren(item.value), registry, counts)
		}
	}
}

/**
 * Renders a list of React children as a JSX snippet. Pass-through wrappers
 * flatten. Text leaves keep their position relative to surrounding elements,
 * and consecutive iterated siblings (3+ identical renders) collapse to a
 * single representative. Authored siblings without keys stay intact.
 */
function renderNodes(nodes: ReactNode[], context: Context, indent: string): string {
	const items = collectChildItems(nodes)

	if (items.length === 0) return ''

	const parts: string[] = []

	let batch: ReactElement[] = []

	const flushBatch = () => {
		if (batch.length === 0) return

		parts.push(...renderElementBatch(batch, context, indent))

		batch = []
	}

	for (const item of items) {
		if (item.kind === 'text') {
			flushBatch()

			parts.push(indent + item.value)
		} else {
			batch.push(item.value)
		}
	}

	flushBatch()

	return parts.join('\n')
}

/**
 * One element of a batch as the walk rendered it, with the map it came from.
 * `localPrints` counts the names that only a callback binds, which it printed.
 */
type RenderedElement = { body: string; map?: string; mapLocal?: true; localPrints: number }

/**
 * Render one element, and note its map and whether it printed a name that only
 * a callback in the JSX binds.
 */
function renderTracked(element: ReactElement, context: Context, indent: string): RenderedElement {
	const before = context.localPrints

	const matched: { fact?: ElementFact } = {}

	const body = renderElement(element, context, indent, matched)

	const { map, mapLocal } = matched.fact ?? {}

	return { body, map, mapLocal, localPrints: context.localPrints - before }
}

/**
 * The lines of a batch. Consecutive elements from one authored map print one
 * by one, unless one of them printed a name that only the map binds, such as
 * its item in `onClick={() => pick(item)}`. That run prints as the authored
 * map instead, which binds the name, and its source pulls what it uses.
 */
function batchLines(rendered: RenderedElement[], context: Context, indent: string): string[] {
	const lines: string[] = []

	for (let start = 0; start < rendered.length; ) {
		const map = rendered[start]?.map

		let end = start + 1

		while (map !== undefined && end < rendered.length && rendered[end]?.map === map) end += 1

		const run = rendered.slice(start, end)

		if (map !== undefined && run.some((element) => element.localPrints > 0)) {
			// The map binds the names that its elements printed. A map over the
			// item of an outer map prints that item, though, so it counts once.
			for (const element of run) context.localPrints -= element.localPrints

			if (run[0]?.mapLocal) context.localPrints += 1

			lines.push(`${indent}{${reindent(registerFactText(map, context), indent)}}`)
		} else {
			for (const { body } of run) if (body) lines.push(indent + body)
		}

		start = end
	}

	return lines
}

/**
 * Renders a run of consecutive elements. Iteration-collapse (3+ identical
 * renders → one) applies only to keyed batches; unkeyed siblings pass through
 * untouched.
 */
function renderElementBatch(elements: ReactElement[], context: Context, indent: string): string[] {
	const lines = batchLines(
		elements.map((element) => renderTracked(element, context, indent)),
		context,
		indent,
	)

	// The keyed check alone decides iteration-collapse, and it needs two elements.
	if (elements.length < 2 || !elements.every(hasExplicitKey)) return lines

	const counts = new Map<string, number>()

	for (const line of lines) counts.set(line, (counts.get(line) ?? 0) + 1)

	const emitted = new Map<string, number>()

	const result: string[] = []

	for (const line of lines) {
		const total = counts.get(line) ?? 1

		const seen = emitted.get(line) ?? 0

		if (total >= 3 && seen >= 1) continue

		emitted.set(line, seen + 1)

		result.push(line)
	}

	return result
}

function hasExplicitKey(element: ReactElement): element is ReactElement & { key: string } {
	// `Children.toArray` marks a user-provided key with a `$` sigil, prefixed by
	// the separator of its position: a top-level keyed sibling reads `.$k`, while
	// one nested inside an array reads `<pos>:$k` (e.g. `.1:$k`). Positional
	// siblings without a key get a plain `.0` / `.1` and no `$`. Match the `$`
	// after either separator so a `.map()` sharing its parent with a sibling
	// still counts as keyed.
	return typeof element.key === 'string' && /[.:]\$/.test(element.key)
}

/**
 * Render a single recognized component element. Unknown components unwrap;
 * their children render in place. `matched` receives the fact the element
 * matched, when it matched one.
 */
function renderElement(
	element: ReactElement,
	context: Context,
	indent: string,
	matched: { fact?: ElementFact } = {},
): string {
	const classified = classifyElement(element, context.registry)

	switch (classified.kind) {
		// Unknown component (e.g. a locally-defined demo wrapper): walk its
		// children for recognizable components.
		case 'children':
			return renderNodes(classified.nodes, context, indent).trimStart()

		// A self-closing helper, with the snippet that the docs plugin's `pre`
		// transform attaches. Its declarations hoist above the JSX, and the element
		// prints as a use of it.
		case 'snippet': {
			const { name } = classified.snippet

			hoistSnippet(classified.snippet, context)

			const props = element.props as Record<string, unknown>

			matched.fact = matchElementFact(name, props, context)

			const propParts = formatProps(props, context, indent, matched.fact)

			return renderOpenTag(name, propParts, indent, false)
		}

		case 'none':
			return ''
	}

	const { info } = classified

	if (info.module) addImport(context, info.module, info.name, info.external)

	const props = element.props as Record<string, unknown>

	const fact = matchElementFact(info.name, props, context)

	matched.fact = fact

	const propParts = formatProps(props, context, indent, fact)

	const childrenStr = renderChildren(element, context, indent + INDENT, fact)

	const open = renderOpenTag(info.name, propParts, indent, childrenStr !== '')

	if (childrenStr === '') return open

	// Short text children render inline between the tags; strip the indent
	// prefix from `childrenStr`.
	if (!childrenStr.includes('\n') && !childrenStr.includes('<')) {
		return `${open}${childrenStr.trimStart()}</${info.name}>`
	}

	return `${open}\n${childrenStr}\n${indent}</${info.name}>`
}

/**
 * Renders the children of a recognized component. A render-prop child — a
 * function the walker could never invoke — emits its authored source verbatim
 * when the element's fact carries it. Otherwise children render via
 * `renderNodes`; when they exist but nothing renders, a `...` placeholder
 * keeps the parent as `<Foo>...</Foo>`.
 */
function renderChildren(
	element: ReactElement,
	context: Context,
	indent: string,
	fact: ElementFact | undefined,
): string {
	const raw = (element.props as { children?: unknown }).children

	if (typeof raw === 'function' && fact?.children) {
		if (fact.local?.includes('children')) context.localPrints += 1

		return `${indent}{${reindent(registerFactText(fact.children, context), indent)}}`
	}

	const nodes = elementChildren(element)

	if (nodes.length === 0) return ''

	const rendered = renderNodes(nodes, context, indent)

	return rendered !== '' ? rendered : PLACEHOLDER
}
