import ts from 'typescript'
import { describe, expect, it } from 'vitest'
import { extractDefaults } from '../../../docs/component-api/extract-defaults'

function firstStatement(text: string): ts.Node {
	const sf = ts.createSourceFile(
		'virtual.tsx',
		text,
		ts.ScriptTarget.Latest,
		true,
		ts.ScriptKind.TSX,
	)

	const stmt = sf.statements[0]

	if (!stmt) throw new Error('no statements parsed from source')

	return stmt
}

function fromFunction(text: string): ts.Node {
	return firstStatement(text)
}

function fromVariable(text: string): ts.Node {
	const v = firstStatement(text) as ts.VariableStatement

	const init = v.declarationList.declarations[0]?.initializer

	if (!init) throw new Error('variable declaration has no initializer')

	return init
}

describe('extractDefaults', () => {
	it('extracts a single string default from destructured parameters', () => {
		const fn = fromFunction(`function Foo({ size = 'md' }) { return null }`)

		const defaults = extractDefaults(fn)

		expect(defaults.get('size')).toBe(`'md'`)
	})

	it('extracts multiple defaults in declaration order', () => {
		const fn = fromFunction(
			`function Foo({ size = 'md', color = 'zinc', disabled = false }) { return null }`,
		)

		const defaults = extractDefaults(fn)

		expect([...defaults.entries()]).toEqual([
			['size', `'md'`],
			['color', `'zinc'`],
			['disabled', `false`],
		])
	})

	it('preserves the source text of complex default expressions verbatim', () => {
		const fn = fromFunction(`function Foo({ items = [1, 2, 3] }) { return null }`)

		expect(extractDefaults(fn).get('items')).toBe('[1, 2, 3]')
	})

	it('skips parameters that have no default initializer', () => {
		const fn = fromFunction(`function Foo({ size = 'md', label, color = 'zinc' }) { return null }`)

		const defaults = extractDefaults(fn)

		expect(defaults.has('size')).toBe(true)
		expect(defaults.has('color')).toBe(true)
		expect(defaults.has('label')).toBe(false)
	})

	it('returns an empty map when the first parameter is not a destructure', () => {
		const fn = fromFunction(`function Foo(props) { return null }`)

		expect(extractDefaults(fn).size).toBe(0)
	})

	it('returns an empty map when the function has no parameters', () => {
		const fn = fromFunction(`function Foo() { return null }`)

		expect(extractDefaults(fn).size).toBe(0)
	})

	it('handles arrow function initializers', () => {
		const fn = fromVariable(`const Foo = ({ size = 'md' }) => null`)

		expect(extractDefaults(fn).get('size')).toBe(`'md'`)
	})

	it('unwraps a forwardRef wrapper and reads its inner destructured defaults', () => {
		const fn = fromVariable(`const Foo = forwardRef(({ size = 'md' }, ref) => null)`)

		expect(extractDefaults(fn).get('size')).toBe(`'md'`)
	})

	it('returns an empty map when the wrapper has no function-like argument', () => {
		const fn = fromVariable(`const Foo = wrap(value)`)

		expect(extractDefaults(fn).size).toBe(0)
	})
})
