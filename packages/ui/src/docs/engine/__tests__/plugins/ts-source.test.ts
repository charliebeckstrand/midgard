// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { parseSource, referencedNames } from '../../plugins/ts-source'

const uses = (code: string) => [...referencedNames(parseSource('demo.tsx', code))].sort()

describe('referencedNames', () => {
	it('reads values, types, JSX tags, and shorthand properties', () => {
		const source = [
			'const total: Price = sum(rows, { tax })',
			'const view = <Card size={total} />',
			`const key = \`\${prefix}-id\``,
		].join('\n')

		expect(uses(source)).toEqual(['Card', 'Price', 'prefix', 'rows', 'sum', 'tax', 'total'])
	})

	it('skips strings, JSX text, and comments', () => {
		expect(uses(`// see Units\nconst label = 'Units'\nconst view = <p>Units</p>`)).toEqual([])
	})

	it('skips declared names, property names, JSX attribute names, and intrinsic tags', () => {
		expect(
			uses(
				'function Row({ columns: cols, id }: Props) {\n\treturn <div columns={cols}>{row.columns}</div>\n}',
			),
		).toEqual(['Props', 'cols', 'row'])
	})

	it('reads the left side of a qualified type name, not its member', () => {
		expect(uses(`type Group = Command['group'] | Api.Group`)).toEqual(['Api', 'Command'])
	})
})
