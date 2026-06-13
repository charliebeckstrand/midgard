import { Children, Fragment, isValidElement, type ReactElement, type ReactNode } from 'react'
import type { ComponentInfo, Context } from './types'

/**
 * Fragment and intrinsic HTML elements are transparent: styling/grouping
 * wrappers outside the documented API surface.
 */
export function isPassThrough(element: ReactElement): boolean {
	return element.type === Fragment || typeof element.type === 'string'
}

export function isPrimitive(value: unknown): value is string | number | boolean {
	return typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean'
}

export function elementChildren(element: ReactElement): ReactNode[] {
	return Children.toArray((element.props as { children?: ReactNode }).children)
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
 * Resolve an element type to its `ComponentInfo`. Build-time tags win.
 * Untagged types fall back to a `displayName` lookup against `byName`,
 * restricted to external entries (demo imports from packages like
 * lucide-react, whose components carry a stable `displayName` but no tag).
 * UI components only resolve by tag; matching them by name could alias a
 * demo-local stand-in.
 */
export function resolveType(type: unknown, context: Context): ComponentInfo | undefined {
	const info = context.registry.byType.get(type)

	if (info) return info

	const displayName = (type as { displayName?: unknown } | null)?.displayName

	if (typeof displayName !== 'string') return undefined

	const named = context.registry.byName.get(displayName)

	return named?.external ? named : undefined
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

// Props that never belong in derived code: either structural (children, key,
// ref) or styling noise (className).
const IGNORED_PROPS: ReadonlySet<string> = new Set(['children', 'className', 'key', 'ref'])

export function formatProps(props: Record<string, unknown>, context: Context): string[] {
	const parts: string[] = []

	for (const [key, value] of Object.entries(props)) {
		if (IGNORED_PROPS.has(key)) continue

		const formatted = formatProp(key, value, context)

		if (formatted !== null) parts.push(formatted)
	}

	return parts
}

function formatProp(key: string, value: unknown, context: Context): string | null {
	if (value === undefined || value === null || value === false) return null

	if (value === true) return key

	if (typeof value === 'string') return `${key}=${jsxString(value)}`

	if (typeof value === 'number') return `${key}={${value}}`

	// Event handlers and other callbacks have no literal form.
	if (typeof value === 'function') return null

	if (isValidElement(value)) {
		const name = getElementName(value, context)

		if (!name) return null

		const childProps = formatProps(value.props as Record<string, unknown>, context)

		const propStr = childProps.length > 0 ? ` ${childProps.join(' ')}` : ''

		return `${key}={<${name}${propStr} />}`
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

	// Present but unserializable: a Date, a class instance, a nested config
	// object, an array of objects. The source identifier (`min={min}`) is
	// unavailable at render time; emit a placeholder.
	return `${key}={${PLACEHOLDER}}`
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
 * Record an import for `name` from `mod`. Allocates the inner Set on first
 * use. `external` marks `mod` as a bare package specifier (`lucide-react`);
 * `assemble` emits it without the `ui/` prefix.
 */
export function addImport(context: Context, mod: string, name: string, external = false): void {
	const set = context.imports.get(mod) ?? new Set<string>()

	set.add(name)

	context.imports.set(mod, set)

	if (external) context.externalModules.add(mod)
}

/**
 * Combine the imports accumulated on `context` with the rendered JSX into the
 * final code block. Sorts imports by module; `react` and external packages
 * keep their bare specifiers, everything else uses the `ui/*` package layout.
 */
export function assemble(context: Context, jsx: string): string {
	const imports = [...context.imports.entries()]
		.sort(([a], [b]) => a.localeCompare(b))
		.map(([mod, names]) => {
			const specifier = mod === 'react' || context.externalModules.has(mod) ? mod : `ui/${mod}`

			return `import { ${[...names].sort().join(', ')} } from '${specifier}'`
		})
		.join('\n')

	return jsx ? `${imports}\n\n${jsx}` : imports
}

/**
 * Components decorated by the docs plugin's `pre` transform carry their
 * original source as `__code`.
 */
type WithCode = { __code?: string }

/**
 * Read the build-time-attached source snippet from a component. Returns null
 * for built-ins, undecorated functions, or non-string `__code` values.
 */
export function readSnippet(type: unknown): string | null {
	if (typeof type !== 'function') return null

	const code = (type as WithCode).__code

	return typeof code === 'string' ? code : null
}

/**
 * Dedents a raw snippet and re-indents subsequent lines to `targetIndent`.
 * Returns line 1 as-is; the caller prefixes it with its own indent, matching
 * the `renderElement` convention.
 */
export function reindent(code: string, targetIndent: string): string {
	const lines = code.split('\n')

	if (lines.length === 1) return code

	const indents = lines.slice(1).flatMap((line) => (line.trim() ? [leadingSpace(line)] : []))

	const minIndent = indents.length === 0 ? 0 : Math.min(...indents)

	return lines
		.map((line, i) => {
			if (i === 0) return line

			if (!line.trim()) return ''

			return targetIndent + line.slice(minIndent)
		})
		.join('\n')
}

function leadingSpace(line: string): number {
	return line.length - line.trimStart().length
}

// Curated alternation matching React's own hooks. The `(?<!\.)` lookbehind
// excludes method calls (`router.use(...)`, `app.useState(...)`) from matching
// as React hooks. Keep in sync with the React `use*` export surface; missing
// entries produce unresolved identifiers in the emitted snippet.
const HOOK_RE =
	/(?<!\.)\b(use|useActionState|useCallback|useContext|useDebugValue|useDeferredValue|useEffect|useFormStatus|useHostTransitionStatus|useId|useImperativeHandle|useInsertionEffect|useLayoutEffect|useMemo|useOptimistic|useReducer|useRef|useState|useSyncExternalStore|useTransition)\b/g

const TAG_RE = /<([A-Z][\w]*)/g

/**
 * Register imports for anything the snippet references: UI components via
 * JSX opening tags, and React hooks via bare identifier use. `addImport`
 * dedupes per-(module,name).
 */
export function collectSnippetImports(snippet: string, context: Context): void {
	for (const [, name] of snippet.matchAll(TAG_RE)) {
		if (!name) continue

		const info = context.registry.byName.get(name)

		if (info?.module) addImport(context, info.module, info.name, info.external)
	}

	for (const [, hook] of snippet.matchAll(HOOK_RE)) {
		if (!hook) continue

		addImport(context, 'react', hook)
	}
}
