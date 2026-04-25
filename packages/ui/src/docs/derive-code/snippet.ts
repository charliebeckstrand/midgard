import { addImport } from './imports'
import type { Ctx } from './types'

/**
 * Components decorated by the derived-code Vite plugin carry their original
 * source as `__code`. Reading it lets the walker show the helper's full body
 * instead of an opaque `<HelperDemo />` tag.
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
 * Dedent a raw snippet (extracted straight from source by the Vite plugin)
 * and re-indent subsequent lines to match the current walker depth. Line 1
 * is returned as-is — the caller always prefixes the first line with its
 * own indent, matching the convention used by `renderElement`.
 */
export function reindent(code: string, targetIndent: string): string {
	const lines = code.split('\n')

	if (lines.length === 1) return lines[0]

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

// Curated list — we don't want to import every `useFoo`-looking custom hook
// the snippet might reference, only React's own.
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
 * JSX opening tags, and React hooks via bare identifier use.
 */
export function collectSnippetImports(snippet: string, ctx: Ctx): void {
	const tagRe = /<([A-Z][\w]*)/g

	const seen = new Set<string>()

	let match: RegExpExecArray | null = tagRe.exec(snippet)

	while (match) {
		const name = match[1]

		if (!seen.has(name)) {
			seen.add(name)

			const info = ctx.registry.byName.get(name)

			if (info?.module) addImport(ctx, info.module, info.name)
		}

		match = tagRe.exec(snippet)
	}

	for (const hook of REACT_HOOKS) {
		if (new RegExp(`\\b${hook}\\b`).test(snippet)) addImport(ctx, 'react', hook)
	}
}
