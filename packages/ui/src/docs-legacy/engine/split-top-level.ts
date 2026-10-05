/**
 * Split source text on a separator character at the top level. The function
 * ignores a separator inside brackets or a string. When `angles` is true, `<`
 * and `>` also nest, as type arguments do. A value keeps `angles` false, so a
 * comparison such as `v.length >= 8` does not change the depth.
 */
export function splitTopLevel(source: string, separator: string, angles: boolean): string[] {
	const parts: string[] = []

	let depth = 0

	let inString: string | null = null

	let current = ''

	for (let i = 0; i < source.length; i++) {
		const ch = source[i]

		if (inString) {
			current += ch

			if (ch === inString && source[i - 1] !== '\\') inString = null

			continue
		}

		if (ch === "'" || ch === '"' || ch === '`') {
			inString = ch
			current += ch

			continue
		}

		if (ch === '{' || ch === '[' || ch === '(' || (angles && ch === '<')) depth++
		else if (ch === '}' || ch === ']' || ch === ')') depth--
		else if (angles && ch === '>' && source[i - 1] !== '=') depth--

		if (ch === separator && depth === 0) {
			if (current.trim()) parts.push(current.trim())

			current = ''

			continue
		}

		current += ch
	}

	if (current.trim()) parts.push(current.trim())

	return parts
}
