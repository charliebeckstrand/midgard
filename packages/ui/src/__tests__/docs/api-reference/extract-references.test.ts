import { ts } from 'ts-morph'
import { describe, expect, it } from 'vitest'
import { extractReferences } from '../../../docs/api-reference/engine/extract-references'
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

	it('renders the apparent shape of an interface (one member per line)', () => {
		const { location, checker } = callableLocation({
			'index.ts': [
				`interface Item { id: string; label: string }`,
				`function Foo(props: { items: Item[] }) { return null }`,
			].join('\n'),
		})

		const refs = extractReferences('Item', location, checker)

		expect(refs?.Item).toContain('id: string')
		expect(refs?.Item).toContain('label: string')

		expect(refs?.Item).toMatch(/^\{/)
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

	it('renders an object alias as its apparent shape, collapsing Pick/Omit composition', () => {
		// The in-memory program doesn't load TypeScript's stdlib, so `Pick` is
		// undefined by default — shadow it inline. The fixture mirrors `Pick`'s
		// definition exactly. `BUILTIN_TYPES` already filters the name from the
		// references queue, so no card is emitted for `Pick` itself.
		const { location, checker } = callableLocation({
			'index.ts': [
				`type Pick<T, K extends keyof T> = { [P in K]: T[P] }`,
				`type Inner = { color: 'red' | 'blue'; size: 'sm' | 'md'; label: string; hidden: boolean }`,
				`type Options = Pick<Inner, 'color' | 'size' | 'label'>`,
				`function Foo(props: { opts: Options }) { return null }`,
			].join('\n'),
		})

		const refs = extractReferences('Options', location, checker)

		expect(refs?.Options).toContain(`color: 'red' | 'blue'`)

		expect(refs?.Options).toContain(`size: 'sm' | 'md'`)

		expect(refs?.Options).toContain('label: string')

		expect(refs?.Options).not.toContain('hidden')

		// `Pick` collapses — no transitive card for `Inner`.
		expect(refs?.Inner).toBeUndefined()
	})

	it('marks optional properties in the apparent shape with `?`', () => {
		const { location, checker } = callableLocation({
			'index.ts': [
				`type Config = { required: string; optional?: number }`,
				`function Foo(props: { config: Config }) { return null }`,
			].join('\n'),
		})

		const refs = extractReferences('Config', location, checker)

		expect(refs?.Config).toContain('required: string')

		expect(refs?.Config).toContain('optional?: number')
	})

	it('drops intersection arms whose declarations live in node_modules', () => {
		const { location, checker } = callableLocation({
			'index.ts': [
				`import type { ComponentPropsWithoutRef } from 'react'`,
				`type Banner = { tone: 'info' | 'warn' } & Omit<ComponentPropsWithoutRef<'div'>, 'className'>`,
				`function Foo(props: { banner: Banner }) { return null }`,
			].join('\n'),
		})

		const refs = extractReferences('Banner', location, checker)

		expect(refs?.Banner).toContain(`tone: 'info' | 'warn'`)

		// HTML attributes from React/DOM typings should not leak in.
		expect(refs?.Banner).not.toContain('onClick')

		expect(refs?.Banner).not.toContain('onPointerDown')

		expect(refs?.Banner).not.toContain('aria-')
	})

	it('blocks declarations under the recipe engine path', () => {
		const program = createInMemoryProgram({
			'core/recipe/engine/types.ts': `export type RecipeInternal = { internal: string }`,
			'index.ts': [
				`import type { RecipeInternal } from './core/recipe/engine/types'`,
				`function Foo(props: { config: RecipeInternal }) { return null }`,
			].join('\n'),
		})

		const sf = program.sourceFiles['index.ts']

		if (!sf) throw new Error('index.ts not found')

		const fn = sf.statements.find((s): s is ts.FunctionDeclaration => ts.isFunctionDeclaration(s))

		if (!fn) throw new Error('no function declaration in index.ts')

		expect(extractReferences('RecipeInternal', fn, program.checker)).toBeUndefined()
	})

	it('keeps function-typed aliases as source text rather than expanding them', () => {
		const { location, checker } = callableLocation({
			'index.ts': [
				`type Handler = (event: string) => void`,
				`function Foo(props: { onEvent: Handler }) { return null }`,
			].join('\n'),
		})

		const refs = extractReferences('Handler', location, checker)

		expect(refs?.Handler).toBe(`(event: string) => void`)
	})
})
