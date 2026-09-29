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
		// `cols` is a parameter, so its use in the body is local.
		expect(
			uses(
				'function Row({ columns: cols, id }: Props) {\n\treturn <div columns={cols}>{row.columns}</div>\n}',
			),
		).toEqual(['Props', 'row'])
	})

	it('reads the left side of a qualified type name, not its member', () => {
		expect(uses(`type Group = Command['group'] | Api.Group`)).toEqual(['Api', 'Command'])
	})

	it('reads a parameter or a local that reuses a name as no use of the outer name', () => {
		const source = [
			'const label = (feature: MapFeature) => String(feature.properties)',
			'function List({ rows }: Props) {',
			'\tconst Row = pick(rows)',
			'\treturn <Row items={rows} />',
			'}',
		].join('\n')

		expect(uses(source)).toEqual(['MapFeature', 'Props', 'String', 'pick'])
	})

	// Widening a block's names to its function would hide the use of `items`.
	it('keeps a block-scoped name inside its block', () => {
		const source = [
			'function Total() {',
			'\tif (open) {',
			'\t\tconst items = []',
			'\t}',
			'\treturn items.length',
			'}',
		].join('\n')

		expect(uses(source)).toEqual(['items', 'open'])
	})

	it('scopes loop heads, catch clauses, type parameters, and mapped keys', () => {
		const source = [
			'for (const row of rows) log(row)',
			'try { run() } catch (error) { report(error) }',
			'function first<T>(list: T[]): T { return list[0] }',
			'type Flags<K extends string> = { [P in K]: boolean }',
		].join('\n')

		expect(uses(source)).toEqual(['log', 'report', 'rows', 'run'])
	})

	it('scopes a `var` to its function, past the block that declares it', () => {
		const source = ['function f() {', '\tif (x) { var hoisted = 1 }', '\treturn hoisted', '}'].join(
			'\n',
		)

		expect(uses(source)).toEqual(['x'])
	})
})
