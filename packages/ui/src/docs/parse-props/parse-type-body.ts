import { cvaVariantsToTypeBody } from './cva'
import { IGNORED_PROPS } from './extract-props'
import { splitAtTopLevel } from './scanner'
import type { PropDef, ResolutionContext } from './types'

export function parseTypeBody(
	typeBody: string,
	defaults: Map<string, string>,
	ctx: ResolutionContext,
): PropDef[] {
	const props: PropDef[] = []

	const inner = typeBody.slice(1, -1).trim()

	if (!inner) return props

	for (const entry of splitAtTopLevel(inner, ';', '\n', ',')) {
		const trimmed = entry.trim()

		if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('/*')) continue

		const propMatch = trimmed.match(/^['"`]?([\w-]+)['"`]?\s*\??:\s*([\s\S]+)$/)

		if (!propMatch) continue

		const [, name, type] = propMatch

		if (!name || IGNORED_PROPS.has(name) || name.startsWith('_')) continue

		const cleanType = (type ?? '').replace(/;?\s*$/, '').trim()

		const references = collectReferences(cleanType, ctx)

		const defaultVal = defaults.get(name)

		const prop: PropDef = { name, type: cleanType }

		if (references) prop.references = references

		if (defaultVal !== undefined) prop.default = defaultVal

		props.push(prop)
	}

	return props
}

/**
 * Walk a type expression and collect definitions for every named type it
 * references — at any depth (inside generics, arrays, function params/returns,
 * tuples, etc.). Primitive-like names (TS built-ins, common React/DOM types,
 * utility types) are skipped. Returns undefined when nothing resolves.
 */
function collectReferences(
	type: string,
	ctx: ResolutionContext,
): Record<string, string> | undefined {
	const refs: Record<string, string> = {}

	const visited = new Set<string>()

	function visit(expression: string, depth: number) {
		if (depth > 4) return

		// VariantProps<typeof X> — resolve via the CVA registry.
		for (const match of expression.matchAll(/VariantProps<typeof\s+(\w+)>/g)) {
			const constName = match[1] ?? ''

			const key = `VariantProps<typeof ${constName}>`

			if (visited.has(key)) continue

			visited.add(key)

			const variants = ctx.cvaVariants.get(constName)

			if (!variants) continue

			const body = cvaVariantsToTypeBody(variants)

			refs[key] = summarize(body)
		}

		for (const name of collectTypeNames(expression)) {
			if (PRIMITIVE_TYPES.has(name) || visited.has(name)) continue

			const typeDef = ctx.typeDefs.get(name)

			if (!typeDef) continue

			visited.add(name)

			const normalized = normalizeWhitespace(typeDef)

			refs[name] = summarize(normalized)

			visit(normalized, depth + 1)
		}
	}

	visit(type, 0)

	if (Object.keys(refs).length === 0) return undefined

	return refs
}

/**
 * Extract identifier tokens that could be type references — PascalCase words
 * not preceded by `.` (which would be property access) and not inside string
 * literals. Single-letter names like `T` are included; lookup decides whether
 * they resolve.
 */
function collectTypeNames(type: string): string[] {
	const names: string[] = []

	let inString: string | null = null

	let i = 0

	while (i < type.length) {
		const ch = type[i] ?? ''

		if (inString) {
			if (ch === inString && type[i - 1] !== '\\') inString = null

			i++

			continue
		}

		if (ch === "'" || ch === '"' || ch === '`') {
			inString = ch

			i++

			continue
		}

		if (/[A-Z]/.test(ch)) {
			const prev = type[i - 1]

			// Skip member access (Foo.Bar) and mid-identifier positions
			if (prev && /[\w$.]/.test(prev)) {
				i++

				continue
			}

			let end = i

			while (end < type.length && /[\w$]/.test(type[end] ?? '')) end++

			names.push(type.slice(i, end))

			i = end

			continue
		}

		i++
	}

	return names
}

/** Object bodies collapse to their key list, both at the top level and within unions. */
function summarize(def: string): string {
	const parts = splitAtTopLevel(def, '|').map((p) => p.trim())

	const summarized = parts.map((part) => {
		if (part.startsWith('{') && part.endsWith('}')) {
			return summarizeBody(part) ?? part
		}

		return part
	})

	return summarized.join(' | ')
}

/** Collapse whitespace to single spaces so multi-line type defs render cleanly. */
function normalizeWhitespace(s: string): string {
	return s.replace(/\s+/g, ' ').trim()
}

/** Summarize an object type body as its top-level union of key names (for display). */
function summarizeBody(body: string): string | undefined {
	const inner = body.slice(1, -1).trim()

	if (!inner) return undefined

	const keys: string[] = []

	for (const entry of splitAtTopLevel(inner, ';', '\n', ',')) {
		const match = entry.trim().match(/^['"`]?([\w-]+)['"`]?\s*\??:/)

		if (match?.[1]) keys.push(match[1])
	}

	if (keys.length === 0) return undefined

	return `{ ${keys.join(', ')} }`
}

/**
 * Names we never want to expand — primitives, TS utility types, and common
 * React/DOM types. Substantive component-level types will always live outside
 * this set.
 */
const PRIMITIVE_TYPES = new Set([
	// TS primitives / top types
	'string',
	'number',
	'boolean',
	'bigint',
	'symbol',
	'undefined',
	'null',
	'void',
	'any',
	'unknown',
	'never',
	'object',
	// TS utility types
	'Array',
	'ReadonlyArray',
	'Record',
	'Partial',
	'Required',
	'Readonly',
	'Pick',
	'Omit',
	'Extract',
	'Exclude',
	'NonNullable',
	'ReturnType',
	'Parameters',
	'Awaited',
	'InstanceType',
	'ConstructorParameters',
	'ThisParameterType',
	'OmitThisParameter',
	// Common JS built-ins
	'Set',
	'Map',
	'WeakSet',
	'WeakMap',
	'Promise',
	'Date',
	'RegExp',
	'Error',
	'Iterable',
	'Iterator',
	'IterableIterator',
	'AsyncIterable',
	'ArrayLike',
	// React
	'ReactNode',
	'ReactElement',
	'ReactFragment',
	'ReactChild',
	'ReactChildren',
	'ReactPortal',
	'JSX',
	'ComponentType',
	'FC',
	'FunctionComponent',
	'ForwardRefExoticComponent',
	'MemoExoticComponent',
	'LazyExoticComponent',
	'CSSProperties',
	'Ref',
	'RefObject',
	'MutableRefObject',
	'ForwardedRef',
	'ElementRef',
	'ComponentRef',
	'ComponentProps',
	'ComponentPropsWithRef',
	'ComponentPropsWithoutRef',
	'HTMLAttributes',
	'AriaAttributes',
	'DOMAttributes',
	'ButtonHTMLAttributes',
	'InputHTMLAttributes',
	'LabelHTMLAttributes',
	'SelectHTMLAttributes',
	'TextareaHTMLAttributes',
	'AnchorHTMLAttributes',
	'FormHTMLAttributes',
	'ImgHTMLAttributes',
	'Dispatch',
	'SetStateAction',
	'Key',
	'PropsWithChildren',
	// React synthetic events
	'SyntheticEvent',
	'MouseEvent',
	'KeyboardEvent',
	'ChangeEvent',
	'FormEvent',
	'FocusEvent',
	'DragEvent',
	'TouchEvent',
	'PointerEvent',
	'WheelEvent',
	'ClipboardEvent',
	'UIEvent',
	'AnimationEvent',
	'TransitionEvent',
	'CompositionEvent',
	// DOM
	'HTMLElement',
	'HTMLDivElement',
	'HTMLButtonElement',
	'HTMLInputElement',
	'HTMLTextAreaElement',
	'HTMLSelectElement',
	'HTMLFormElement',
	'HTMLAnchorElement',
	'HTMLLabelElement',
	'HTMLImageElement',
	'HTMLSpanElement',
	'HTMLUListElement',
	'HTMLOListElement',
	'HTMLLIElement',
	'HTMLParagraphElement',
	'HTMLHeadingElement',
	'HTMLTableElement',
	'HTMLTableRowElement',
	'HTMLTableCellElement',
	'HTMLTableSectionElement',
	'Element',
	'Node',
	'Document',
	'Window',
	'EventTarget',
	'File',
	'FileList',
	'Blob',
	'FormData',
	'URLSearchParams',
	// TS reserved-ish keywords that can appear capitalized in generics
	'VariantProps',
])
