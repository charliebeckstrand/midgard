/**
 * Dedents a raw snippet and re-indents subsequent lines to `targetIndent`.
 * Returns line 1 as-is; the caller prefixes it with its own indent, matching
 * the `renderElement` convention. Whitespace-only interior lines collapse to
 * empty. With `''` as the target this is a plain dedent.
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
