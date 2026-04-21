import { extractBalancedBraces, extractObjectKeys, splitAtTopLevel } from './scanner'

type ConstMatch = { rhs: string; position: number }

/**
 * Resolve an expression (variable, member access, function call) to the keys
 * of the object it evaluates to, using regex-based static analysis of the
 * concatenated source pool.
 *
 * Uses a visited set for cycle detection instead of a depth limit.
 *
 * Returns the keys or `null` if resolution fails.
 */
export function resolveObjectKeys(
	expr: string,
	source: string,
	visited: Set<string> = new Set(),
	hintPos?: number,
): string[] | null {
	const trimmed = expr.trim()

	if (!trimmed) return null

	// Cycle detection — skip expressions we've already tried resolving
	if (visited.has(trimmed)) return null
	visited.add(trimmed)

	// Inline object literal — extract keys, resolving spreads and shorthands
	if (trimmed.startsWith('{')) {
		return extractKeysWithSpreads(trimmed, source, visited, hintPos)
	}

	// Function call — unwrap and resolve the first argument
	// Handles colorKeys(...) and similar key-preserving wrappers
	const funcMatch = trimmed.match(/^\w+\s*\(([\s\S]+)\)\s*$/)

	if (funcMatch) {
		const arg = firstArgument(funcMatch[1])

		return arg ? resolveObjectKeys(arg, source, visited, hintPos) : null
	}

	// Object.fromEntries(Object.entries(X)...) — same keys as X
	const ofeMatch = trimmed.match(/^Object\.fromEntries\s*\(\s*Object\.entries\s*\(\s*(.+?)\s*\)/)

	if (ofeMatch) {
		return resolveObjectKeys(ofeMatch[1], source, visited, hintPos)
	}

	// Member expression (a.b.c)
	if (trimmed.includes('.')) {
		return resolveMemberChain(trimmed, source, visited, hintPos)
	}

	// Simple identifier — look up const assignment
	if (/^\w+$/.test(trimmed)) {
		return resolveVariable(trimmed, source, visited, hintPos)
	}

	return null
}

/** Resolve a simple variable name to the keys of its assigned value. */
function resolveVariable(
	name: string,
	source: string,
	visited: Set<string>,
	hintPos?: number,
): string[] | null {
	const matches = findAllConstRhs(name, source)

	if (hintPos !== undefined) {
		matches.sort((a, b) => Math.abs(a.position - hintPos) - Math.abs(b.position - hintPos))
	}

	for (const { rhs, position } of matches) {
		const keys = resolveObjectKeys(rhs, source, visited, position)

		if (keys && keys.length > 0) return keys
	}

	return null
}

/**
 * Resolve a dotted member expression like `katachi.button.variant`.
 * Walks the chain one segment at a time, resolving each step through
 * const assignments and object property lookups.
 */
function resolveMemberChain(
	expr: string,
	source: string,
	visited: Set<string>,
	hintPos?: number,
): string[] | null {
	const parts = expr.split('.')

	const root = parts[0]

	const rest = parts.slice(1)

	if (!root || rest.length === 0) return null

	const matches = findAllConstRhs(root, source)

	if (hintPos !== undefined) {
		matches.sort((a, b) => Math.abs(a.position - hintPos) - Math.abs(b.position - hintPos))
	}

	// Try each definition of root — multiple files may define the same name
	for (const { rhs: rootRhs, position } of matches) {
		// If root resolves to another member expression, prepend and recurse
		// e.g. k = katachi.button → k.size becomes katachi.button.size
		if (/^[\w.]+$/.test(rootRhs) && !rootRhs.startsWith('{')) {
			const expanded = `${rootRhs}.${rest.join('.')}`
			const keys = resolveObjectKeys(expanded, source, visited, position)

			if (keys && keys.length > 0) return keys

			continue
		}

		// If root resolves to an object literal, walk into it
		if (rootRhs.startsWith('{')) {
			const keys = walkObjectProperties(rootRhs, rest, source, visited, position)

			if (keys && keys.length > 0) return keys
		}
	}

	return null
}

/**
 * Walk into an object literal body to find a nested property.
 * For `{ variant: { solid: {...}, ... }, size: { sm: [...], md: [...] } }` and
 * path ["size"], returns the keys of the `size` object literal.
 */
function walkObjectProperties(
	objectBody: string,
	path: string[],
	source: string,
	visited: Set<string>,
	hintPos?: number,
): string[] | null {
	if (path.length === 0) return extractObjectKeys(objectBody)

	const targetKey = path[0]

	const remaining = path.slice(1)

	const value = extractPropertyValue(objectBody, targetKey)

	if (!value) return null

	const trimmed = value.trim()

	// Property value is an object literal — walk deeper
	if (trimmed.startsWith('{')) {
		const body = extractBalancedBraces(trimmed, 0)

		if (body) return walkObjectProperties(body, remaining, source, visited, hintPos)

		return null
	}

	// Shorthand property (value === key name) or reference — resolve it
	// Pass hintPos so nearby definitions are preferred over distant ones
	const target = remaining.length > 0 ? `${trimmed}.${remaining.join('.')}` : trimmed

	return resolveObjectKeys(target, source, visited, hintPos)
}

/**
 * Extract keys from an object literal, handling spreads and shorthands.
 * - `key: value` → extracts `key`
 * - `key` (shorthand) → extracts `key`
 * - `...expr` → resolves `expr` and merges its keys
 */
function extractKeysWithSpreads(
	body: string,
	source: string,
	visited: Set<string>,
	hintPos?: number,
): string[] | null {
	const inner = body.slice(1, -1).trim()

	if (!inner) return null

	const keys: string[] = []

	for (const entry of splitAtTopLevel(inner, ',', '\n')) {
		const trimmed = entry.trim()

		if (!trimmed) continue

		// Spread: ...expr
		if (trimmed.startsWith('...')) {
			const spreadExpr = trimmed.slice(3).trim()
			const spreadKeys = resolveObjectKeys(spreadExpr, source, visited, hintPos)

			if (spreadKeys) keys.push(...spreadKeys)

			continue
		}

		// key: value
		const kvMatch = trimmed.match(/^['"]?([\w-]+)['"]?\s*:/)

		if (kvMatch?.[1]) {
			keys.push(kvMatch[1])

			continue
		}

		// Shorthand property: just an identifier
		const shorthandMatch = trimmed.match(/^(\w+)$/)

		if (shorthandMatch?.[1]) {
			keys.push(shorthandMatch[1])
		}
	}

	return keys.length > 0 ? keys : null
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Find all RHS values for `[export] const <name> = <rhs>` in the source.
 * Returns matches with their source positions so callers can prefer nearby
 * definitions (important when the same name exists in multiple files).
 */
function findAllConstRhs(name: string, source: string): ConstMatch[] {
	const results: ConstMatch[] = []

	const regex = new RegExp(`(?:export\\s+)?(?:const|let|var)\\s+${name}\\s*=\\s*`, 'g')

	for (let m = regex.exec(source); m !== null; m = regex.exec(source)) {
		const start = m.index + m[0].length

		const ch = source[start]

		// Object literal
		if (ch === '{') {
			const body = extractBalancedBraces(source, start)

			if (body) results.push({ rhs: body, position: m.index })

			continue
		}

		// Expression (e.g. Object.fromEntries(...), member access, etc.)
		const rest = source.slice(start)

		const line = extractExpressionRhs(rest)

		if (line) results.push({ rhs: line, position: m.index })
	}

	return results
}

/**
 * Extract the value of a property from an object literal body string.
 * Handles both `key: value` and shorthand `key` (returns the key name itself).
 */
function extractPropertyValue(objectBody: string, key: string): string | null {
	const inner = objectBody.slice(1, -1)

	for (const entry of splitAtTopLevel(inner, ',', '\n')) {
		const trimmed = entry.trim()

		if (!trimmed) continue

		// key: value
		const kvMatch = trimmed.match(new RegExp(`^${key}\\s*:\\s*([\\s\\S]+)$`))

		if (kvMatch) {
			return kvMatch[1].trim()
		}

		// Shorthand: just the key name
		if (trimmed === key) {
			return key
		}
	}

	return null
}

/** Extract the first argument from a comma-separated argument list (respecting nesting). */
function firstArgument(argsStr: string): string | null {
	const parts = splitAtTopLevel(argsStr.trim(), ',')

	return parts[0]?.trim() ?? null
}

/**
 * Extract a complete expression RHS, handling multi-line expressions with
 * balanced parens/braces. Stops at a top-level newline that isn't followed
 * by a continuation character.
 */
function extractExpressionRhs(source: string): string | null {
	let depth = 0

	let inString: string | null = null

	for (let i = 0; i < source.length; i++) {
		const ch = source[i]

		if (inString) {
			if (ch === inString && source[i - 1] !== '\\') inString = null

			continue
		}

		if (ch === "'" || ch === '"' || ch === '`') {
			inString = ch

			continue
		}

		if (ch === '{' || ch === '[' || ch === '(') depth++
		else if (ch === '}' || ch === ']' || ch === ')') depth--

		if (depth === 0 && ch === '\n') {
			const rhs = source.slice(0, i).trim()

			return rhs || null
		}
	}

	const rhs = source.trim()

	return rhs || null
}
