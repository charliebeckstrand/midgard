import { Children, type ReactElement, type ReactNode } from 'react'
import { formatProps, INDENT, renderOpenTag } from './format'
import { extractTextContent, flattenPassThroughs, isMeaningfulElement } from './tree'
import type { Ctx } from './types'

// ---------------------------------------------------------------------------
// Tree traversal
// ---------------------------------------------------------------------------

/**
 * Render a list of React children as a JSX snippet. The heart of the
 * derivation: flattens noise, detects iteration patterns, and falls back to a
 * deduplicated sibling render when no higher-level pattern matches.
 */
export function renderNodes(nodes: ReactNode[], ctx: Ctx, indent: string): string {
	// Flattening at every level lets list detection see the real components
	// that were wrapped in styling divs/spans.
	const elements = flattenPassThroughs(nodes.filter(isMeaningfulElement))

	if (elements.length === 0) return ''

	if (elements.length === 1) {
		return indent + renderElement(elements[0], ctx, indent)
	}

	// Render each sibling, collapsing 3+ identical outputs (iterated rows)
	// to a single representative while keeping structural duplicates (e.g.
	// two ResizablePanel siblings) intact.
	const lines: string[] = []

	const counts = new Map<string, number>()

	for (const el of elements) {
		const body = renderElement(el, ctx, indent)

		if (!body) continue

		const line = indent + body

		counts.set(line, (counts.get(line) ?? 0) + 1)

		lines.push(line)
	}

	// Only deduplicate lines that appear 3+ times (true iteration pattern).
	const emitted = new Map<string, number>()

	const result: string[] = []

	for (const line of lines) {
		const total = counts.get(line) ?? 1

		const seen = emitted.get(line) ?? 0

		if (total >= 3 && seen >= 1) continue

		emitted.set(line, seen + 1)

		result.push(line)
	}

	return result.join('\n')
}

/**
 * Render a single recognized component element. Unknown components are
 * transparently unwrapped so their internal composition can still contribute.
 */
export function renderElement(element: ReactElement, ctx: Ctx, indent: string): string {
	const info = ctx.registry.byType.get(element.type) ?? null

	if (!info) {
		// Unknown component (e.g. a locally-defined demo wrapper). Walk its
		// children for whatever recognizable components they contain.
		const children = Children.toArray((element.props as { children?: ReactNode }).children)

		if (children.length > 0) {
			return renderNodes(children, ctx, indent).trimStart()
		}

		// Self-closing helper with a build-time snippet attached by the
		// derived-code Vite plugin. Use the raw JSX verbatim so users see
		// the actual composition rather than an opaque `<HelperDemo />`.
		if (typeof element.type === 'function') {
			const snippet = (element.type as { __code?: unknown }).__code

			if (typeof snippet === 'string') {
				collectImportsFromSnippet(snippet, ctx)

				return reindent(snippet, indent)
			}
		}

		return ''
	}

	if (info.module) {
		const set = ctx.imports.get(info.module) ?? new Set<string>()

		set.add(info.name)

		ctx.imports.set(info.module, set)
	}

	const props = element.props as Record<string, unknown>

	const propParts = formatProps(props, ctx)

	const childNodes = Children.toArray(props.children as ReactNode)

	const childrenStr = renderChildrenContent(childNodes, ctx, indent + INDENT)

	const open = renderOpenTag(info.name, propParts, indent, childrenStr !== '')

	if (childrenStr === '') return open

	// Inline short text children (e.g. <Card>Left</Card>) rather than
	// breaking them across multiple lines.
	if (!childrenStr.includes('\n') && !childrenStr.includes('<')) {
		return `${open}${childrenStr}</${info.name}>`
	}

	return `${open}\n${childrenStr}\n${indent}</${info.name}>`
}

/**
 * Render the children of a recognized component. Combines text extraction
 * with recursive walking so mixed bodies (e.g. `<Icon />` plus a label)
 * show both the nested component and the text content.
 */
export function renderChildrenContent(nodes: ReactNode[], ctx: Ctx, indent: string): string {
	if (nodes.length === 0) return ''

	const rendered = renderNodes(nodes, ctx, indent).trimEnd()

	const text = extractTextContent(nodes)

	if (rendered === '') {
		// Children exist but nothing was recognized — show a placeholder so
		// the parent renders as `<Foo>…</Foo>` instead of `<Foo />`.
		return text ?? '…'
	}

	if (text) {
		return `${rendered}\n${indent}${text}`
	}

	return rendered
}

/**
 * Dedent a raw snippet (extracted straight from source by the Vite plugin)
 * and re-indent subsequent lines to match the current walker depth. Line 1
 * is returned as-is — the caller always prefixes the first line with its
 * own indent, matching the convention used by `renderElement`.
 */
function reindent(code: string, targetIndent: string): string {
	const lines = code.split('\n')

	if (lines.length === 1) return lines[0]

	let minIndent = Infinity

	for (let i = 1; i < lines.length; i += 1) {
		const line = lines[i]

		if (!line.trim()) continue

		const match = line.match(/^[\t ]*/)

		const len = match ? match[0].length : 0

		if (len < minIndent) minIndent = len
	}

	if (!Number.isFinite(minIndent)) minIndent = 0

	return lines
		.map((line, i) => {
			if (i === 0) return line

			if (!line.trim()) return ''

			return targetIndent + line.slice(minIndent)
		})
		.join('\n')
}

const REACT_HOOKS = [
	'useCallback',
	'useContext',
	'useDebugValue',
	'useDeferredValue',
	'useEffect',
	'useId',
	'useImperativeHandle',
	'useInsertionEffect',
	'useLayoutEffect',
	'useMemo',
	'useReducer',
	'useRef',
	'useState',
	'useSyncExternalStore',
	'useTransition',
]

/**
 * Register imports for anything the snippet references: UI components via
 * JSX opening tags, and React hooks via bare identifier use. Names are
 * resolved against the component map; React hook names come from a small
 * curated list so we don't import every `useFoo`-looking custom hook.
 */
function collectImportsFromSnippet(snippet: string, ctx: Ctx): void {
	const tagRe = /<([A-Z][\w]*)/g

	const seen = new Set<string>()

	let match: RegExpExecArray | null = tagRe.exec(snippet)

	while (match) {
		const name = match[1]

		if (!seen.has(name)) {
			seen.add(name)

			const info = ctx.registry.byName.get(name)

			if (info?.module) {
				const set = ctx.imports.get(info.module) ?? new Set<string>()

				set.add(info.name)

				ctx.imports.set(info.module, set)
			}
		}

		match = tagRe.exec(snippet)
	}

	for (const hook of REACT_HOOKS) {
		if (new RegExp(`\\b${hook}\\b`).test(snippet)) {
			const set = ctx.imports.get('react') ?? new Set<string>()

			set.add(hook)

			ctx.imports.set('react', set)
		}
	}
}
