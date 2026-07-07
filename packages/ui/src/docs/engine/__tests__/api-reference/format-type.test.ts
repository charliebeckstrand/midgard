import { ts } from 'ts-morph'
import { describe, expect, it } from 'vitest'
import { formatPropType, formatType } from '../../api-reference/engine/format-type'
import { createInMemoryProgram } from './helpers'

function typeOfPropValue(sources: Record<string, string>): {
	type: ts.Type
	checker: ts.TypeChecker
	location: ts.Node
} {
	const program = createInMemoryProgram(sources)

	const sf = program.sourceFiles['index.ts']

	if (!sf) throw new Error('index.ts not found')

	// Finds `const value: T = …` and returns the type of `value`.
	for (const stmt of sf.statements) {
		if (!ts.isVariableStatement(stmt)) continue

		for (const decl of stmt.declarationList.declarations) {
			if (ts.isIdentifier(decl.name) && decl.name.text === 'value') {
				const type = program.checker.getTypeAtLocation(decl)

				return { type, checker: program.checker, location: decl }
			}
		}
	}

	throw new Error('no `const value: T` declaration found in index.ts')
}

describe('formatType — named aliases and interfaces', () => {
	it('prefers an alias name over the inlined union', () => {
		const { type, checker, location } = typeOfPropValue({
			'index.ts': [`type Size = 'sm' | 'md' | 'lg'`, `declare const value: Size`].join('\n'),
		})

		expect(formatType(type, checker, location)).toBe('Size')
	})

	it('uses an interface name (no expanded type-parameter defaults)', () => {
		const { type, checker, location } = typeOfPropValue({
			'index.ts': [`interface Item { id: string }`, `declare const value: Item`].join('\n'),
		})

		expect(formatType(type, checker, location)).toBe('Item')
	})

	it('preserves explicit non-default type arguments', () => {
		const { type, checker, location } = typeOfPropValue({
			'index.ts': `declare const value: Set<string>`,
		})

		expect(formatType(type, checker, location)).toBe('Set<string>')
	})
})

describe('formatType — string-literal quoting', () => {
	it('renders string-literal members with single quotes', () => {
		const { type, checker, location } = typeOfPropValue({
			'index.ts': `declare const value: 'sm' | 'md'`,
		})

		const out = formatType(type, checker, location)

		expect(out).toContain(`'sm'`)

		expect(out).toContain(`'md'`)

		expect(out).not.toContain(`"sm"`)
	})
})

describe('formatPropType — strips `| undefined` from optional unions', () => {
	it('drops `| undefined` and unwraps a single remaining arm', () => {
		const { type, checker, location } = typeOfPropValue({
			'index.ts': `declare const value: string | undefined`,
		})

		expect(formatPropType(type, checker, location)).toBe('string')
	})

	it('drops `| undefined` and joins the remaining arms with `|`', () => {
		const { type, checker, location } = typeOfPropValue({
			'index.ts': `declare const value: 'sm' | 'md' | undefined`,
		})

		const out = formatPropType(type, checker, location)

		expect(out).toContain(`'sm'`)

		expect(out).toContain(`'md'`)

		expect(out).not.toContain('undefined')
	})

	it('preserves a named interface across the optional-stripping path', () => {
		// Uses a project-local interface, independent of @types/react.
		const { type, checker, location } = typeOfPropValue({
			'index.ts': [
				`interface Theme { color: string }`,
				`declare function pick<T>(x: T | undefined): T | undefined`,
				`declare const theme: Theme`,
				`const value = pick(theme)`,
			].join('\n'),
		})

		const out = formatPropType(type, checker, location)

		expect(out).not.toContain('undefined')

		expect(out).toBe('Theme')
	})

	it('leaves unions without `undefined` alone', () => {
		const { type, checker, location } = typeOfPropValue({
			'index.ts': `declare const value: string | number`,
		})

		const out = formatPropType(type, checker, location)

		expect(out).toContain('string')

		expect(out).toContain('number')
	})

	it('collapses a `literal | (string & {})` autocomplete union to `string`', () => {
		const { type, checker, location } = typeOfPropValue({
			'index.ts': `declare const value: 'on' | 'off' | (string & {}) | undefined`,
		})

		expect(formatPropType(type, checker, location)).toBe('string')
	})

	it('keeps a branded `string & { … }` union rather than collapsing it', () => {
		const { type, checker, location } = typeOfPropValue({
			'index.ts': `declare const value: 'on' | (string & { __brand: 'x' })`,
		})

		const out = formatPropType(type, checker, location)

		expect(out).not.toBe('string')
	})
})

describe('formatPropType — boolean collapse', () => {
	it('renders an optional boolean as `boolean`, not `false | true`', () => {
		const { type, checker, location } = typeOfPropValue({
			'index.ts': `declare const value: boolean | undefined`,
		})

		expect(formatPropType(type, checker, location)).toBe('boolean')
	})

	it('collapses the boolean pair when other arms remain after stripping `undefined`', () => {
		const { type, checker, location } = typeOfPropValue({
			'index.ts': `declare const value: boolean | 'auto' | undefined`,
		})

		const out = formatPropType(type, checker, location)

		expect(out).toContain('boolean')

		expect(out).toContain(`'auto'`)

		expect(out).not.toContain('true')
	})

	it('keeps a lone boolean literal as its literal, not `boolean`', () => {
		const { type, checker, location } = typeOfPropValue({
			'index.ts': `declare const value: true | 'auto' | undefined`,
		})

		const out = formatPropType(type, checker, location)

		expect(out).toContain('true')

		expect(out).not.toContain('boolean')
	})

	it('strips only `| undefined`, keeping `| null`', () => {
		const { type, checker, location } = typeOfPropValue({
			'index.ts': `declare const value: string | null | undefined`,
		})

		const out = formatPropType(type, checker, location)

		expect(out).toContain('string')

		expect(out).toContain('null')

		expect(out).not.toContain('undefined')
	})
})

describe('createInMemoryProgram — standard library resolution', () => {
	it('resolves global types (regression: lib files must load, not degrade to `{}`)', () => {
		const { type, checker } = typeOfPropValue({
			'index.ts': `declare const value: number[]`,
		})

		// A lib-less program can't resolve `Array`, collapsing the type to `{}`.
		const rendered = checker.typeToString(type)

		expect(rendered).toContain('number')

		expect(rendered).not.toBe('{}')
	})
})

describe('formatType — function types', () => {
	it('formats a single-signature function with parameter and return rendering', () => {
		const { type, checker, location } = typeOfPropValue({
			'index.ts': `declare const value: (count: number) => string`,
		})

		const out = formatType(type, checker, location)

		expect(out).toBe('(count: number) => string')
	})
})
