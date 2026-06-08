import { addImport } from './imports'
import type { Context } from './types'

/**
 * Components decorated by the derive-code Vite plugin carry their original
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
 * Dedents a raw snippet and re-indents subsequent lines to `targetIndent`.
 * Line 1 is returned as-is — the caller prefixes it with its own indent,
 * matching the convention used by `renderElement`.
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
 * dedupes per-(module,name), so repeated matches are harmless.
 */
export function collectSnippetImports(snippet: string, context: Context): void {
	for (const [, name] of snippet.matchAll(TAG_RE)) {
		if (!name) continue

		const info = context.registry.byName.get(name)

		if (info?.module) addImport(context, info.module, info.name)
	}

	for (const [, hook] of snippet.matchAll(HOOK_RE)) {
		if (!hook) continue

		addImport(context, 'react', hook)
	}
}
