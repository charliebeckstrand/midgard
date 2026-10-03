import * as React from 'react'
import { isValidElement, type ReactElement, type ReactNode } from 'react'
import * as ReactDOM from 'react-dom'
import { IGNORED_PROPS } from '../reserved-props'
import { elementChildren, isPassThrough, resolveTypeIn } from './classify'
import { reindent } from './indent'
import {
	type ComponentInfo,
	type ComponentRegistry,
	type Context,
	type ElementFact,
	type HelperSnippet,
	hasFacts,
	type ImportFact,
	type SourceFacts,
} from './types'

export function isPrimitive(value: unknown) {
	return typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean'
}

type ChildItem = { kind: 'text'; value: string } | { kind: 'element'; value: ReactElement }

/**
 * Walk children in source order, flattening pass-through wrappers and
 * surfacing both recognized elements and text leaves as a position-preserving
 * sequence. Adjacent text leaves coalesce into a single item; inline
 * interpolation like `<Foo>Hi {name}</Foo>` renders on one line.
 */
export function collectChildItems(nodes: ReactNode[]): ChildItem[] {
	const items: ChildItem[] = []

	let textBuffer: string[] = []

	const flushText = () => {
		if (textBuffer.length === 0) return

		items.push({ kind: 'text', value: textBuffer.join(' ') })

		textBuffer = []
	}

	// Text leaves accumulate into a run; appending an element ends the run.
	const addText = (value: string) => {
		if (value !== '') textBuffer.push(value)
	}

	const addElement = (element: ReactElement) => {
		flushText()

		items.push({ kind: 'element', value: element })
	}

	const add = (item: ChildItem) => {
		if (item.kind === 'text') addText(item.value)
		else addElement(item.value)
	}

	for (const n of nodes) {
		if (typeof n === 'string' || typeof n === 'number') {
			addText(String(n).trim())

			continue
		}

		if (!isValidElement(n)) continue

		// Pass-through wrappers (Fragment, intrinsic tags) flatten: recurse and
		// merge their text leaves into the current run; `<span>Hi</span> there`
		// coalesces.
		if (isPassThrough(n)) collectChildItems(elementChildren(n)).forEach(add)
		else addElement(n)
	}

	flushText()

	return items
}

/**
 * A fresh walk state over `registry`, with empty accumulators. The one place
 * the {@link Context} shape is written out, so a new field reaches every caller
 * at once.
 */
export function createContext(registry: ComponentRegistry, facts?: SourceFacts): Context {
	return {
		registry,
		imports: new Map(),
		externalModules: new Set(),
		packageName: registry.packageName,
		facts,
		used: new Set(),
		pulledDecls: new Set(),
		hoisted: new Map(),
		rendered: new Map(),
		matched: new Map(),
		localPrints: 0,
	}
}

/**
 * Resolve an element type to its `ComponentInfo`. Build-time tags win.
 * Untagged types fall back to a `displayName` lookup against `byName`,
 * restricted to external entries. Those are demo imports from packages like
 * lucide-react, whose components carry a stable `displayName` but no tag.
 * UI components only resolve by tag; matching them by name could alias a
 * demo-local stand-in.
 */
export function resolveType(type: unknown, context: Context): ComponentInfo | undefined {
	return resolveTypeIn(context.registry, type)
}

/**
 * Resolve a name for a nested element prop, recording the import for
 * recognized components. Registered and external components win; bare
 * intrinsic strings (e.g. `<div />` as an icon) pass through. Anything else
 * returns `null`; the caller drops the prop.
 */
export function getElementName(element: ReactElement, context: Context): string | null {
	const info = resolveType(element.type, context)

	if (info) {
		if (info.module) addImport(context, info.module, info.name, info.external)

		return info.name
	}

	return typeof element.type === 'string' ? element.type : null
}

export const INDENT = '  '

// Stand-in for content that's present but has no clean literal form: an
// unrenderable child subtree, or a prop value like a Date or class instance.
export const PLACEHOLDER = '...'

/**
 * Format an element's props in authored order. Live runtime values render as
 * today. Props with no live form (functions, class instances, nested configs)
 * fall back to their authored source text when `fact` carries it. They then fall
 * back to the historical behavior: functions drop, everything else
 * placeholders.
 *
 * A second pass applies the consistency rule. A live primitive prop whose
 * authored source is a bare identifier renders as that identifier. That holds
 * once the identifier's declaration is already pulled into the preamble. A
 * controlled pair therefore reads `value={value} onValueChange={setValue}`,
 * rather than mixing a frozen live value with source-form wiring.
 *
 * An element prop is the exception to "live first": it prints from its fact
 * when one carries it, unless that source uses a name of a callback in the JSX.
 *
 * A live `false`, `null`, or `undefined` reads as absent and prints only from
 * its fact: as `key={false}` or `key={null}` when the demo authors that
 * literal, or as its identifier through the consistency rule. A controlled
 * `value={date}` that holds `null` at render therefore keeps its value beside
 * its setter. Any other source drops it.
 */
export function formatProps(
	props: Record<string, unknown>,
	context: Context,
	indent = '',
	fact?: ElementFact,
): string[] {
	type Slot = { key: string; text: string; live: boolean }

	const slots: Slot[] = []

	for (const [key, value] of Object.entries(props)) {
		if (IGNORED_PROPS.has(key)) continue

		// An element prop prints from its authored source when a fact carries it.
		// The live form loses an identifier, such as `sidebar={sidebar}`, and the
		// source reads as the demo wrote it. A source that uses a name of a callback
		// in the JSX does not stand on its own, so the live form prints then.
		const authored =
			isValidElement(value) && !fact?.local?.includes(key) ? fact?.props[key] : undefined

		if (authored !== undefined) {
			slots.push({
				key,
				text: `${key}={${reindent(registerFactText(authored, context), indent + INDENT)}}`,
				live: false,
			})

			continue
		}

		const live = formatLiveProp(key, value, context)

		if (live === null) {
			// A live `false`, `null`, or `undefined` reads as absent. An authored
			// `false` turns off a prop whose default is on, and an authored `null`
			// keeps a prop controlled, so each prints. Another source prints only
			// through the consistency pass below, as a controlled `open={open}` does.
			const source = fact?.props[key]

			if (source !== undefined) {
				const literal = value === false ? 'false' : value === null ? 'null' : undefined

				slots.push({ key, text: source === literal ? `${key}={${literal}}` : '', live: true })
			}

			continue
		}

		if (live !== undefined) {
			slots.push({ key, text: live, live: true })

			continue
		}

		const source = fact?.props[key]

		if (source !== undefined) {
			if (fact?.local?.includes(key)) context.localPrints += 1

			slots.push({
				key,
				text: `${key}={${reindent(registerFactText(source, context), indent + INDENT)}}`,
				live: false,
			})

			continue
		}

		// Event handlers have no literal form, and an element whose type resolves
		// to nothing could alias a demo-local stand-in; without authored source to
		// fall back on, both drop as before.
		if (typeof value === 'function' || isValidElement(value)) continue

		// Present but unserializable: a Date, a class instance, a nested config
		// object, an array of objects — and no authored source to fall back on.
		slots.push({ key, text: `${key}={${PLACEHOLDER}}`, live: false })
	}

	for (const slot of slots) {
		if (!slot.live) continue

		const source = fact?.props[slot.key]

		if (source === undefined || !IDENTIFIER_RE.test(source)) continue

		const decl = own(context.facts?.bindings, source)

		if (decl === undefined || !context.pulledDecls.has(decl)) continue

		slot.text = `${slot.key}={${registerFactText(source, context)}}`
	}

	return slots.flatMap((slot) => (slot.text === '' ? [] : [slot.text]))
}

/**
 * Render a prop's live runtime value. Returns the formatted attribute, `null`
 * when the prop is semantically absent (`undefined`/`null`/`false`), or
 * `undefined` when the value is present but has no live form. The `undefined`
 * is the caller's cue to try authored source.
 */
function formatLiveProp(key: string, value: unknown, context: Context): string | null | undefined {
	if (value === undefined || value === null || value === false) return null

	if (value === true) return key

	if (typeof value === 'string') return `${key}=${jsxString(value)}`

	if (typeof value === 'number') return `${key}={${value}}`

	if (typeof value === 'function') return undefined

	if (isValidElement(value)) {
		const element = formatElement(value, context)

		return element === null ? undefined : `${key}={${element}}`
	}

	if (Array.isArray(value) && value.every(isPrimitive)) {
		return `${key}={[${value.map(formatLiteral).join(', ')}]}`
	}

	// Flat object of primitives — responsive props (`columns={{ initial: 1,
	// sm: 2, lg: 3 }}`), inline `style`, etc. — serialize as an object literal
	// so the snippet shows the real shape, not an opaque placeholder.
	if (isPlainObject(value)) {
		const literal = formatObjectLiteral(value)

		if (literal !== null) return `${key}={${literal}}`
	}

	return undefined
}

const IDENTIFIER_RE = /^[A-Za-z_$][\w$]*$/

/**
 * The live form of an element prop's value, as inline JSX with its children.
 * A text child prints as text, and an element child prints the same way. Returns
 * null for an element whose type resolves to no name, and drops such a child.
 */
function formatElement(element: ReactElement, context: Context): string | null {
	const name = getElementName(element, context)

	if (!name) return null

	const props = formatProps(element.props as Record<string, unknown>, context)

	const open = props.length > 0 ? `<${name} ${props.join(' ')}` : `<${name}`

	const children = elementChildren(element).flatMap((child) => {
		if (typeof child === 'string' || typeof child === 'number') return [jsxText(String(child))]

		const nested = isValidElement(child) ? formatElement(child, context) : null

		return nested === null ? [] : [nested]
	})

	return children.length > 0 ? `${open}>${children.join('')}</${name}>` : `${open} />`
}

/** JSX text, or a string expression when the text holds a character that JSX reads as syntax. */
function jsxText(text: string): string {
	return /[{}<>]/.test(text) ? `{${JSON.stringify(text)}}` : text
}

/**
 * A plain object literal (a responsive config like `{ initial: 1, sm: 2 }`),
 * as opposed to a class instance, Date, Map, or React element. Elements and
 * arrays are handled by earlier `formatProp` branches.
 */
function isPlainObject(value: unknown): value is Record<string, unknown> {
	if (typeof value !== 'object' || value === null) return false

	const proto = Object.getPrototypeOf(value)

	return proto === Object.prototype || proto === null
}

/**
 * Serialize a flat object of primitives as a JS object literal
 * (`{ initial: 1, sm: 2, lg: 3 }`), preserving authored key order. Returns
 * null when any value is non-primitive (nested objects, elements, Dates have
 * no clean inline form) so the caller falls back to the placeholder.
 */
function formatObjectLiteral(value: Record<string, unknown>): string | null {
	const entries = Object.entries(value)

	if (entries.length === 0) return null

	const parts: string[] = []

	for (const [key, v] of entries) {
		if (!isPrimitive(v)) return null

		parts.push(`${formatObjectKey(key)}: ${formatLiteral(v)}`)
	}

	return `{ ${parts.join(', ')} }`
}

// Identifier keys stay bare (`initial`, `sm`, `lg`); breakpoints like `2xl`
// that aren't valid identifiers get quoted.
function formatObjectKey(key: string): string {
	return /^[A-Za-z_$][\w$]*$/.test(key) ? key : JSON.stringify(key)
}

// Double-quoted JSX attribute; falls back to braces + JSON when the value
// contains characters requiring escaping.
function jsxString(value: string): string {
	if (!value.includes('"') && !value.includes('\n')) return `"${value}"`

	return `{${JSON.stringify(value)}}`
}

function formatLiteral(value: string | number | boolean): string {
	// `JSON.stringify` escapes embedded quotes, backslashes, and control
	// characters.
	if (typeof value === 'string') return JSON.stringify(value)

	return String(value)
}

/**
 * Build an opening JSX tag. Decides between inline (`<Foo a="1" b="2">`) and
 * multi-line (one prop per line) based on total length.
 */
export function renderOpenTag(
	name: string,
	propParts: string[],
	indent: string,
	hasChildren: boolean,
): string {
	if (propParts.length === 0) {
		return hasChildren ? `<${name}>` : `<${name} />`
	}

	const close = hasChildren ? '>' : ' />'

	const inline = `<${name} ${propParts.join(' ')}${close}`

	if (inline.length <= 80 && !propParts.some((p) => p.includes('\n'))) {
		return inline
	}

	const propIndent = indent + INDENT

	return `<${name}\n${propParts.map((p) => propIndent + p).join('\n')}\n${indent}${hasChildren ? '>' : '/>'}`
}

/**
 * How an import line takes a name: as a named value, as a named type, or as
 * the default export of the module.
 */
export type ImportKind = 'value' | 'type' | 'default'

/**
 * Record an import for `name` from `mod`. Allocates the inner Set on first
 * use. `external` marks `mod` as a bare package specifier (`lucide-react`);
 * `assemble` emits it without the library prefix. A `type` import reads
 * `type Name` in the braces, and a `default` import reads
 * `import Name from`.
 */
export function addImport(
	context: Context,
	mod: string,
	name: string,
	external = false,
	kind: ImportKind = 'value',
): void {
	const set = context.imports.get(mod) ?? new Set<string>()

	set.add(kind === 'value' ? name : `${kind} ${name}`)

	context.imports.set(mod, set)

	if (external) context.externalModules.add(mod)
}

/** The bare name of an import entry, without its `type ` or `default ` marker. */
const bareName = (entry: string) => entry.replace(/^(?:type|default) /, '')

/**
 * One module's named imports, sorted by the bare name. A `type X` entry goes
 * when `X` also imports as a value, because the value import covers the type.
 * A default import is no named import, so it goes too.
 */
function importNames(names: Set<string>): string[] {
	return [...names]
		.filter((entry) => !entry.startsWith('default '))
		.filter((entry) => !entry.startsWith('type ') || !names.has(bareName(entry)))
		.sort((a, b) => {
			const left = bareName(a)

			const right = bareName(b)

			return left < right ? -1 : left > right ? 1 : 0
		})
}

/**
 * Combine the imports accumulated on `context` with the declarations and the
 * rendered JSX into the final code block. Sorts imports by module; `react` and
 * external packages keep their bare specifiers, everything else uses the
 * documented library's `<packageName>/*` layout.
 *
 * The hoisted helper declarations come first, and the preamble follows. A
 * preamble declaration can name a helper, but a helper's blocks already hold
 * each declaration they use. A declaration that both hold prints once, in the
 * hoisted place.
 */
export function assemble(context: Context, jsx: string, preamble: string[] = []): string {
	const imports = [...context.imports.entries()]
		.sort(([a], [b]) => a.localeCompare(b))
		.flatMap(([mod, names]) => {
			const specifier =
				mod === 'react' || context.externalModules.has(mod) ? mod : `${context.packageName}/${mod}`

			const named = importNames(names)

			const braces = named.length > 0 ? [`{ ${named.join(', ')} }`] : []

			const defaults = [...names].filter((entry) => entry.startsWith('default ')).map(bareName)

			// One default shares the line of the named imports. A line takes one
			// default, so each other default takes its own line.
			const [first, ...rest] = defaults

			const lines = [[first, ...braces].filter(Boolean).join(', ')]

			return [...lines, ...rest]
				.filter(Boolean)
				.map((clause) => `import ${clause} from '${specifier}'`)
		})
		.join('\n')

	const hoisted = [...context.hoisted].flatMap(([declarations, blocks]) =>
		[...blocks].sort((a, b) => a - b).map((index) => reindent(declarations[index] ?? '', '')),
	)

	const printed = new Set(hoisted)

	return [imports, ...hoisted, ...preamble.filter((code) => !printed.has(code)), jsx]
		.filter(Boolean)
		.join('\n\n')
}

/** Whether two element facts claim the same prop keys. */
function sameKeys(a: ElementFact, b: ElementFact): boolean {
	const keys = Object.keys(a.props)

	return (
		keys.length === Object.keys(b.props).length && keys.every((key) => Object.hasOwn(b.props, key))
	)
}

/**
 * Resolve the source fact for a rendered element. Call it once for each
 * element that the walk renders, in the order of the walk.
 *
 * The walk renders the authored elements of a tag in source order. When it
 * renders as many elements of the tag as the facts list, the k-th rendered
 * element takes the k-th fact of the tag. A map or a condition can render more
 * or fewer elements than the source holds. Then the match falls back to the
 * candidates: the facts of the tag that claim only props the runtime element
 * carries. A single survivor wins outright. Of several survivors, the one that
 * claims each key of the others wins, when no other claims the same keys. Else
 * the survivors reduce to their consensus: the props (and render-prop children) every candidate agrees on.
 * An ambiguous match therefore drops a prop, instead of attaching another
 * element's source.
 */
export function matchElementFact(
	name: string,
	props: Record<string, unknown>,
	context: Context,
): ElementFact | undefined {
	const facts = context.facts

	if (!facts) return undefined

	const ofTag = facts.elements.filter((e) => e.name === name)

	const position = context.matched.get(name) ?? 0

	context.matched.set(name, position + 1)

	// An authored prop stays a key of the runtime props even while its value is
	// `undefined`, so a key the element lacks marks another element's fact.
	const claims = (e: ElementFact) => Object.keys(e.props).every((key) => Object.hasOwn(props, key))

	const paired = ofTag[position]

	if (context.rendered.get(name) === ofTag.length && paired && claims(paired)) return paired

	const candidates = ofTag.filter((e) => hasFacts(e) && claims(e))

	const first = candidates[0]

	if (!first) return undefined

	if (candidates.length === 1) return first

	// The runtime element carries each key of each candidate. A candidate that
	// claims each key of the others is then the most specific source. A
	// conditional sibling of the same tag with fewer props cannot claim its keys.
	const widest = candidates.find((e) =>
		candidates.every((other) =>
			Object.keys(other.props).every((key) => Object.hasOwn(e.props, key)),
		),
	)

	if (widest && candidates.every((other) => other === widest || !sameKeys(other, widest))) {
		return widest
	}

	const rest = candidates.slice(1)

	const agreed: Record<string, string> = {}

	for (const [key, source] of Object.entries(first.props)) {
		if (rest.every((c) => c.props[key] === source)) agreed[key] = source
	}

	const children = rest.every((c) => c.children === first.children) ? first.children : undefined

	const body = rest.every((c) => c.body === first.body) ? first.body : undefined

	const local = first.local?.filter((key) => key in agreed || (key === 'children' && children))

	const map = rest.every((c) => c.map === first.map) ? first.map : undefined

	return {
		name,
		props: agreed,
		...(local?.length ? { local } : {}),
		children,
		...(body === undefined ? {} : { body }),
		...(map === undefined ? {} : { map, ...(first.mapLocal ? { mapLocal: true as const } : {}) }),
	}
}

/**
 * The value of an own key of a record that the facts carry. A record parsed
 * from JSON inherits keys such as `toString`, and a name or a source can
 * match one.
 */
function own<T>(record: Readonly<Record<string, T>> | undefined, key: string): T | undefined {
	return record && Object.hasOwn(record, key) ? record[key] : undefined
}

/**
 * Record an authored source that the walk prints: add the names that it uses
 * (see `SourceFacts.uses`) to the walk's names, and mark each declaration that
 * one of them binds as pulled. `formatProps`' consistency pass keys on that
 * mark. Returns `text` so call sites can register inline.
 */
export function registerFactText(text: string, context: Context): string {
	const facts = context.facts

	if (!facts) return text

	for (const name of own(facts.uses, text) ?? []) {
		context.used.add(name)

		const index = own(facts.bindings, name)

		if (index !== undefined) context.pulledDecls.add(index)
	}

	return text
}

/**
 * Add to the pulled declarations each declaration that a pulled declaration
 * uses, to fixpoint. Returns the names that the printed sources and the pulled
 * declarations use.
 *
 * @remarks
 * `deriveCode` calls it before its second walk too. A declaration that only a
 * pulled declaration uses, such as the `useState` pair whose setter a callback
 * calls, is then pulled when the consistency pass of `formatProps` runs. A prop
 * that reads that state prints its identifier, and the state is not left unread.
 */
export function closePulledDecls(context: Context): Set<string> {
	const used = new Set(context.used)

	const facts = context.facts

	if (!facts) return used

	// The pulled declarations whose names the closure has yet to read.
	const pending = [...context.pulledDecls]

	for (let index = pending.pop(); index !== undefined; index = pending.pop()) {
		for (const name of facts.declarations[index]?.uses ?? []) {
			used.add(name)

			const next = own(facts.bindings, name)

			if (next === undefined || context.pulledDecls.has(next)) continue

			context.pulledDecls.add(next)

			pending.push(next)
		}
	}

	return used
}

/**
 * Close over the declarations the printed sources use. A source pulls the
 * declarations that its names bind, and a pulled declaration's own names pull
 * more, to fixpoint. Then register the import of each name that the sources
 * and the pulled declarations use (see {@link registerUses}). Returns the pulled
 * declarations dedented, in source order, ready to sit between the imports and
 * the JSX.
 *
 * @remarks
 * The names come from the syntax tree at build time, so a word in a string, in
 * JSX text, in a comment, or in a property name pulls nothing.
 */
export function resolvePreamble(context: Context): string[] {
	const facts = context.facts

	if (!facts || context.used.size === 0) return []

	registerUses(closePulledDecls(context), context)

	return [...context.pulledDecls]
		.sort((a, b) => a - b)
		.flatMap((index) => {
			const code = facts.declarations[index]?.code

			return code ? [reindent(code, '')] : []
		})
}

/**
 * Hoist a helper's blocks above the JSX, and register the imports they use:
 * each entry of the snippet's import table. The blocks key by the file's
 * table, so a declaration that two helpers of a file share prints once.
 */
export function hoistSnippet(snippet: HelperSnippet, context: Context): void {
	const blocks = context.hoisted.get(snippet.declarations) ?? new Set<number>()

	for (const index of snippet.blocks) blocks.add(index)

	context.hoisted.set(snippet.declarations, blocks)

	for (const [name, fact] of Object.entries(snippet.imports)) registerImport(name, fact, context)
}

// `use` (the React 19 API) or a `use<Capital>` hook name.
function isHookName(name: string): boolean {
	return name === 'use' || /^use[A-Z]/.test(name)
}

// Hook → owning package, derived from the installed React and ReactDOM export
// surfaces so the set never drifts from the version in use. React entries are
// spread last and win any name collision, keeping `react` the canonical
// specifier. Replaces a hand-curated alternation that had already drifted: it
// omitted `useEffectEvent` and attributed react-dom's `useFormStatus` to `react`.
export const HOOK_MODULES: ReadonlyMap<string, string> = new Map([
	...Object.keys(ReactDOM)
		.filter(isHookName)
		.map((name) => [name, 'react-dom'] as const),
	...Object.keys(React)
		.filter(isHookName)
		.map((name) => [name, 'react'] as const),
])

/** Register the import line of one entry of an import table. */
function registerImport(name: string, fact: ImportFact, context: Context): void {
	// A type-only default reads as a value default: TypeScript takes either.
	const kind = fact.default ? 'default' : fact.type ? 'type' : 'value'

	addImport(context, fact.module, name, fact.external ?? false, kind)
}

/**
 * Register the import of each name in `names`. A name that the facts' import
 * table holds imports as that entry says. Any other name imports as a
 * component of the registry or as a React hook. A name that is neither, such
 * as a local or a global, imports nothing. `addImport` dedupes
 * per-(module,name).
 */
export function registerUses(names: Iterable<string>, context: Context): void {
	for (const name of names) {
		const fact = own(context.facts?.imports, name)

		if (fact) {
			registerImport(name, fact, context)

			continue
		}

		const info = context.registry.byName.get(name)

		if (info?.module) {
			addImport(context, info.module, info.name, info.external)

			continue
		}

		const module = HOOK_MODULES.get(name)

		// `react` is rendered bare by `assemble` already; flag any other package
		// (e.g. `react-dom`) external so its specifier stays bare too.
		if (module) addImport(context, module, name, module !== 'react')
	}
}
