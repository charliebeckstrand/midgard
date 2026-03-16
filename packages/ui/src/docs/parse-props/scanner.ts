/** Extract a balanced `(...)` block starting at `start` */
export function extractBalancedParens(source: string, start: number): string | null {
	return extractBalanced(source, start, '(', ')')
}

/** Extract a balanced `{...}` block starting at `start` */
export function extractBalancedBraces(source: string, start: number): string | null {
	return extractBalanced(source, start, '{', '}')
}

function extractBalanced(
	source: string,
	start: number,
	open: string,
	close: string,
): string | null {
	if (source[start] !== open) return null

	let depth = 0

	for (let i = start; i < source.length; i++) {
		if (source[i] === open) depth++
		else if (source[i] === close) {
			depth--

			if (depth === 0) return source.slice(start, i + 1)
		}
	}

	return null
}

/** Split a string at top-level occurrences of any delimiter character, respecting nesting and strings */
export function splitAtTopLevel(str: string, ...delimiters: string[]): string[] {
	const parts: string[] = []

	let depth = 0

	let current = ''

	let inString: string | null = null

	for (let i = 0; i < str.length; i++) {
		const ch = str[i]

		if (inString) {
			current += ch

			if (ch === inString && str[i - 1] !== '\\') inString = null

			continue
		}

		if (ch === "'" || ch === '"' || ch === '`') {
			inString = ch

			current += ch

			continue
		}

		if (ch === '{' || ch === '[' || ch === '(' || ch === '<') depth++
		else if (ch === '}' || ch === ']' || ch === ')') depth--
		else if (ch === '>' && str[i - 1] !== '=') depth--

		if (delimiters.includes(ch) && depth === 0) {
			if (current.trim()) parts.push(current.trim())

			current = ''
		} else {
			current += ch
		}
	}

	if (current.trim()) parts.push(current.trim())

	return parts
}

/** Extract object keys from a `{ key: value, ... }` body, respecting nesting */
export function extractObjectKeys(body: string): string[] {
	const inner = body.slice(1, -1).trim()

	if (!inner) return []

	return splitAtTopLevel(inner, ',')
		.map((entry) => {
			const match = entry.trim().match(/^['"]?([\w-]+)['"]?\s*:/)

			return match?.[1]
		})
		.filter((key): key is string => key !== undefined)
}

/** Extract the first `{...}` block from a string, with balanced brace matching */
export function extractInlineObjectType(annotation: string): string | null {
	const start = annotation.indexOf('{')

	if (start === -1) return null

	return extractBalancedBraces(annotation, start)
}

/** Extract the RHS of a type alias, stopping at the first top-level newline */
export function extractTypeRhs(source: string, start: number): string | null {
	let depth = 0

	let inString: string | null = null

	for (let i = start; i < source.length; i++) {
		const ch = source[i]

		if (inString) {
			if (ch === inString && source[i - 1] !== '\\') inString = null

			continue
		}

		if (ch === "'" || ch === '"' || ch === '`') {
			inString = ch

			continue
		}

		if (ch === '{' || ch === '[' || ch === '(' || ch === '<') depth++
		else if (ch === '}' || ch === ']' || ch === ')') depth--
		else if (ch === '>' && source[i - 1] !== '=') depth--

		if (ch === '\n' && depth === 0) {
			const rhs = source.slice(start, i).trim()

			return rhs || null
		}
	}

	const rhs = source.slice(start).trim()

	return rhs || null
}
