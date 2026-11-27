// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { formatCode } from '../kit/format-code.ts'

describe('formatCode', () => {
	it('puts each key of an object on a line of its own', () => {
		expect(formatCode('{ toolbar: false, contextMenu: true }')).toBe(
			'{\n  toolbar: false,\n  contextMenu: true,\n}',
		)
	})

	it('indents a nested object and an array of objects', () => {
		expect(formatCode("{ size: { w: 8 }, items: [{ id: 'a' }], tags: ['x', 'y'] }")).toBe(
			[
				'{',
				'  size: {',
				'    w: 8,',
				'  },',
				'  items: [',
				'    {',
				"      id: 'a',",
				'    },',
				'  ],',
				"  tags: ['x', 'y'],",
				'}',
			].join('\n'),
		)
	})

	it('keeps an array of literals and an empty value on one line', () => {
		expect(formatCode("['csv', 'excel']")).toBe("['csv', 'excel']")

		expect(formatCode('[]')).toBe('[]')

		expect(formatCode('{}')).toBe('{}')
	})

	it('keeps the punctuation in a string', () => {
		expect(formatCode("{ label: 'a, b: {c}' }")).toBe("{\n  label: 'a, b: {c}',\n}")
	})

	it('keeps code that is not one object or one array as it is', () => {
		expect(formatCode("'md'")).toBe("'md'")

		expect(formatCode('() => {}')).toBe('() => {}')

		expect(formatCode('{ a: 1 } as const')).toBe('{ a: 1 } as const')

		expect(formatCode("{ a: 'open")).toBe("{ a: 'open")
	})
})
