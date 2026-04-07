/**
 * Tagged template literal for example code blocks.
 *
 * - Auto-dedents based on minimum indentation
 * - Trims leading/trailing blank lines
 * - Joins array interpolations with newlines, preserving indentation
 */
export function code(strings: TemplateStringsArray, ...values: (string | string[])[]) {
	let result = ''

	for (let i = 0; i < strings.length; i++) {
		result += strings[i]

		if (i < values.length) {
			const val = values[i]
			const joined = Array.isArray(val) ? val.join('\n') : val

			// Find the indentation at the interpolation point
			// (everything after the last newline in result so far)
			const lastNewline = result.lastIndexOf('\n')
			const currentLine = lastNewline === -1 ? result : result.slice(lastNewline + 1)
			const indent = currentLine.match(/^(\s*)/)?.[1] ?? ''

			// Apply that indentation to every line after the first
			result += joined
				.split('\n')
				.map((line, j) => (j === 0 ? line : indent + line))
				.join('\n')
		}
	}

	const lines = result.split('\n')

	// Find minimum indentation (ignoring empty lines)
	const indent = lines
		.filter((l) => l.trim())
		.reduce((min, l) => Math.min(min, l.search(/\S/)), Number.POSITIVE_INFINITY)

	if (indent > 0 && indent < Number.POSITIVE_INFINITY) {
		return lines
			.map((l) => l.slice(indent))
			.join('\n')
			.trim()
	}

	return result.trim()
}
