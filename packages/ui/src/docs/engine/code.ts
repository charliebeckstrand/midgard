/**
 * Tagged template literal for example code blocks. Auto-dedents to the
 * minimum indentation, and trims leading and trailing blank lines.
 *
 * @remarks The tag takes no interpolation, so `${…}` in a sample is a `tsc`
 * error. Escape it as `\${…}` to show it as text.
 */
export function code(strings: TemplateStringsArray) {
	const result = strings[0] ?? ''

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
