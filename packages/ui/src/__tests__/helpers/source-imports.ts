/**
 * One import statement's specifier, and whether it survives compilation.
 *
 * Parsed rather than pattern-matched: this codebase writes no semicolons, so a
 * `[^;]*` body runs past the end of its own statement and swallows the imports
 * below it. The clause is instead taken non-greedily up to its own `from`.
 */
export type ImportRef = { specifier: string; runtime: boolean }

// A re-export takes only a braced or a `*` clause, so an `export` declaration
// never reads as one.
const IMPORT =
	/^(?:import\s+([\s\S]*?)|export\s+((?:type\s+)?(?:\{[^}]*\}|\*(?:\s+as\s+\w+)?)))\sfrom\s*['"]([^'"]+)['"]/gm

/**
 * Whether an import clause emits a runtime dependency: `import type { … }` and
 * a clause whose every named binding carries its own `type` are both erased, so
 * neither is a runtime dependency. A bare `import 'x'` has no clause
 * and never reaches here — it carries no `from`.
 */
function isRuntimeClause(clause: string): boolean {
	const body = clause.trim()

	if (body.startsWith('type ')) return false

	const named = body.match(/\{([\s\S]*)\}/)

	// A default or namespace binding sits outside the braces and is always runtime.
	if (
		!named ||
		body
			.replace(/\{[\s\S]*\}/, '')
			.replace(/,/g, '')
			.trim() !== ''
	)
		return true

	return (named[1] ?? '')
		.split(',')
		.map((part) => part.trim())
		.filter(Boolean)
		.some((part) => !part.startsWith('type '))
}

/** Each `import … from` and `export … from` statement of `content`, in order. */
export function importsOf(content: string): ImportRef[] {
	return [...content.matchAll(IMPORT)].map((match) => ({
		specifier: match[3] as string,
		runtime: isRuntimeClause((match[1] ?? match[2]) as string),
	}))
}
