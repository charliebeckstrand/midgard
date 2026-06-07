/** Split a type expression on top-level `|`, ignoring `|` inside nesting and strings. */
export function splitUnion(type: string): string[] {
	const parts: string[] = []

	let depth = 0

	let inString: string | null = null

	let current = ''

	for (let i = 0; i < type.length; i++) {
		const ch = type[i]

		if (inString) {
			current += ch

			if (ch === inString && type[i - 1] !== '\\') inString = null

			continue
		}

		if (ch === "'" || ch === '"' || ch === '`') {
			inString = ch
			current += ch

			continue
		}

		if (ch === '{' || ch === '[' || ch === '(' || ch === '<') depth++
		else if (ch === '}' || ch === ']' || ch === ')') depth--
		else if (ch === '>' && type[i - 1] !== '=') depth--

		if (ch === '|' && depth === 0) {
			if (current.trim()) parts.push(current.trim())

			current = ''

			continue
		}

		current += ch
	}

	if (current.trim()) parts.push(current.trim())

	return parts
}
