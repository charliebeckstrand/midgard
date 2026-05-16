import ts from 'typescript'
import { describe, expect, it } from 'vitest'
import { extractReferences } from '../../../docs/component-api/extract-references'
import { createInMemoryProgram } from './helpers'

function callableLocation(sources: Record<string, string>): {
	location: ts.Node
	checker: ts.TypeChecker
} {
	const program = createInMemoryProgram(sources)

	const sf = program.sourceFiles['index.ts']

	if (!sf) throw new Error('index.ts not found')

	const fn = sf.statements.find((s): s is ts.FunctionDeclaration => ts.isFunctionDeclaration(s))

	if (!fn) throw new Error('no function declaration in index.ts')

	return { location: fn, checker: program.checker }
}

describe('extractReferences', () => {
	it('resolves a project-authored type alias by name', () => {
		const { location, checker } = callableLocation({
			'index.ts': [
				`type Size = 'sm' | 'md' | 'lg'`,
				`function Foo(props: { size: Size }) { return null }`,
			].join('\n'),
		})

		const refs = extractReferences('Size', location, checker)

		expect(refs?.Size).toBe(`'sm' | 'md' | 'lg'`)
	})

	it('resolves a project-authored interface by name (with member list)', () => {
		const { location, checker } = callableLocation({
			'index.ts': [
				`interface Item { id: string; label: string }`,
				`function Foo(props: { items: Item[] }) { return null }`,
			].join('\n'),
		})

		const refs = extractReferences('Item', location, checker)

		expect(refs?.Item).toContain('id: string')
		expect(refs?.Item).toContain('label: string')
	})

	it('returns undefined when no resolvable references are present', () => {
		const { location, checker } = callableLocation({
			'index.ts': `function Foo(props: { size: string }) { return null }`,
		})

		expect(extractReferences('string', location, checker)).toBeUndefined()
	})

	it('skips built-in utility types (Array, Pick, Omit, Promise, …)', () => {
		const { location, checker } = callableLocation({
			'index.ts': [
				`type Size = 'sm' | 'md'`,
				`function Foo(props: { sizes: Array<Size> }) { return null }`,
			].join('\n'),
		})

		const refs = extractReferences('Array<Size>', location, checker)

		expect(refs?.Array).toBeUndefined()
		expect(refs?.Size).toBe(`'sm' | 'md'`)
	})

	it('recurses through alias definitions to harvest transitively referenced types', () => {
		const { location, checker } = callableLocation({
			'index.ts': [
				`type Color = 'zinc' | 'red'`,
				`type Theme = { color: Color }`,
				`function Foo(props: { theme: Theme }) { return null }`,
			].join('\n'),
		})

		const refs = extractReferences('Theme', location, checker)

		expect(refs?.Theme).toContain('color: Color')
		expect(refs?.Color).toBe(`'zinc' | 'red'`)
	})

	it('does not harvest PascalCase tokens that appear inside string literals', () => {
		const { location, checker } = callableLocation({
			'index.ts': [
				`type Slot = 'PageHeader' | 'PageBody'`,
				`function Foo(props: { slot: Slot }) { return null }`,
			].join('\n'),
		})

		const refs = extractReferences('Slot', location, checker)

		expect(refs?.Slot).toBe(`'PageHeader' | 'PageBody'`)
		// The PascalCase tokens inside the literal must not become reference keys.
		expect(refs?.PageHeader).toBeUndefined()
		expect(refs?.PageBody).toBeUndefined()
	})

	it('preserves type-parameter syntax for generic aliases', () => {
		const { location, checker } = callableLocation({
			'index.ts': [
				`type Box<T> = { value: T }`,
				`function Foo(props: { box: Box<string> }) { return null }`,
			].join('\n'),
		})

		const refs = extractReferences('Box', location, checker)

		expect(refs?.Box).toMatch(/^<T>\s*=\s*\{/)
	})

	it('skips node_modules declarations (React.ReactNode, etc.)', () => {
		const { location, checker } = callableLocation({
			'index.ts': [
				`import type { ReactNode } from 'react'`,
				`function Foo(props: { children: ReactNode }) { return null }`,
			].join('\n'),
		})

		const refs = extractReferences('ReactNode', location, checker)

		expect(refs?.ReactNode).toBeUndefined()
	})
})
