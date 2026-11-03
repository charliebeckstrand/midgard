import { describe, expect, it } from 'vitest'
import { srcDir, srcRelative, stripSourceComments, walkSource } from '../helpers/walk-source'

// A file holds what its name says (CONVENTIONS §9.2). A `types.ts` file and each
// file in `src/types` hold types only. A value in such a file hides from a
// reader who looks for it by the file name, so a constant goes to a constants
// file and a function goes to a helper file. The scan reads the top level of
// each file: a statement that declares a value, or an export clause without
// `type`, is a value.

const VALUE_STATEMENT =
	/^(?:export\s+)?(?:declare\s+)?(?:const|let|var|function|async\s+function|class|abstract\s+class|enum)\b/m

const VALUE_EXPORT_CLAUSE = /^export\s+\{/m

function isTypesFile(rel: string): boolean {
	return rel.endsWith('/types.ts') || rel === 'types.ts' || rel.startsWith('types/')
}

describe('types file boundary', () => {
	it('a types file exports types only', () => {
		const violations: string[] = []

		walkSource(srcDir, (file, content) => {
			const rel = srcRelative(file)

			if (!isTypesFile(rel)) return

			const code = stripSourceComments(content)

			const match = code.match(VALUE_STATEMENT) ?? code.match(VALUE_EXPORT_CLAUSE)

			if (match) violations.push(`${rel}: ${match[0].trim()}`)
		})

		expect(
			violations,
			`move each value to a constants or a helper file:\n  ${violations.join('\n  ')}`,
		).toEqual([])
	})
})
