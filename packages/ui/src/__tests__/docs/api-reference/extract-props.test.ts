import { ts } from 'ts-morph'
import { describe, expect, it } from 'vitest'
import { extractProps } from '../../../docs/api-reference/engine/extract-props'
import type { PropDef } from '../../../docs/api-reference/types'
import { createInMemoryProgram } from './helpers'

/**
 * Run `extractProps` over an inline `function Foo(props: {…})`. Pass a string
 * for a single `index.ts`, or a file map for cross-file fixtures (the callable
 * must still live in `index.ts`). `defaults` stands in for the destructuring
 * defaults `buildComponent` would harvest.
 */
function propsOf(
	source: string | Record<string, string>,
	defaults: Map<string, string> = new Map(),
): PropDef[] {
	const files = typeof source === 'string' ? { 'index.ts': source } : source

	const program = createInMemoryProgram(files)

	const sf = program.sourceFiles['index.ts']

	if (!sf) throw new Error('index.ts not found')

	const fn = sf.statements.find((s): s is ts.FunctionDeclaration => ts.isFunctionDeclaration(s))

	if (!fn) throw new Error('no function declaration in index.ts')

	const checker = program.checker

	const param = checker.getSignatureFromDeclaration(fn)?.parameters[0]

	if (!param) throw new Error('no props parameter')

	const propsType = checker.getTypeOfSymbolAtLocation(param, fn)

	return extractProps(fn, propsType, null, defaults, checker, () => null)
}

function prop(props: PropDef[], name: string): PropDef {
	const found = props.find((p) => p.name === name)

	if (!found) throw new Error(`no prop named ${name}`)

	return found
}

describe('extractProps — TSDoc', () => {
	it('extracts the prose summary and marks the prop required', () => {
		const p = prop(
			propsOf(
				[
					`function Foo(props: {`,
					`  /** Ordered columns. Each needs a stable id. */`,
					`  columns: number[]`,
					`}) { return null }`,
				].join('\n'),
			),
			'columns',
		)

		expect(p.description).toBe('Ordered columns. Each needs a stable id.')
		expect(p.required).toBe(true)
	})

	it('leaves `required` absent for optional props', () => {
		const p = prop(
			propsOf(`function Foo(props: { disabled?: boolean }) { return null }`),
			'disabled',
		)

		expect(p.required).toBeUndefined()
	})

	it('fills `default` from `@default` and strips the tag from the summary', () => {
		const p = prop(
			propsOf(
				[
					`function Foo(props: {`,
					`  /** Seconds per sweep. @default 2 */`,
					`  speed?: number`,
					`}) { return null }`,
				].join('\n'),
			),
			'speed',
		)

		expect(p.default).toBe('2')
		expect(p.description).toBe('Seconds per sweep.')
	})

	it('prefers the destructuring default over `@default`', () => {
		const p = prop(
			propsOf(
				[
					`function Foo(props: {`,
					`  /** Seconds per sweep. @default 2 */`,
					`  speed?: number`,
					`}) { return null }`,
				].join('\n'),
				new Map([['speed', '3']]),
			),
			'speed',
		)

		expect(p.default).toBe('3')
	})

	it('captures `@deprecated` as message or bare flag', () => {
		const props = propsOf(
			[
				`function Foo(props: {`,
				`  /** @deprecated use size instead */ scale?: number`,
				`  /** @deprecated */ legacy?: boolean`,
				`}) { return null }`,
			].join('\n'),
		)

		expect(prop(props, 'scale').deprecated).toBe('use size instead')
		expect(prop(props, 'legacy').deprecated).toBe(true)
	})

	it('captures `@example`', () => {
		const p = prop(
			propsOf(
				[
					`function Foo(props: {`,
					'  /** Renders a tag. @example <Foo tag="x" /> */',
					`  tag?: string`,
					`}) { return null }`,
				].join('\n'),
			),
			'tag',
		)

		expect(p.example).toContain('<Foo')
		expect(p.description).toBe('Renders a tag.')
	})
})

describe('extractProps — type display', () => {
	it('preserves the authored project alias instead of expanding it', () => {
		const p = prop(
			propsOf(
				[
					`type Responsive<T> = T | { initial?: T; sm?: T; md?: T }`,
					`function Foo(props: { columns?: Responsive<number> }) { return null }`,
				].join('\n'),
			),
			'columns',
		)

		// The optional `?` lives on the property name, not the type node.
		expect(p.type).toBe('Responsive<number>')
		// The preserved alias now reaches the references resolver.
		expect(p.references?.Responsive).toContain('initial?:')
	})

	it('inlines an enum-like `keyof typeof` alias to its values with no reference', () => {
		const p = prop(
			propsOf(
				[
					`const k = { none: 0, sm: 1, md: 2, lg: 3 } as const`,
					`type ContainerPadding = keyof typeof k`,
					`function Foo(props: { padding?: ContainerPadding }) { return null }`,
				].join('\n'),
			),
			'padding',
		)

		expect(p.type).toBe(`'none' | 'sm' | 'md' | 'lg'`)
		expect(p.references).toBeUndefined()
	})

	it('inlines a direct literal-union alias to its values with no reference', () => {
		const p = prop(
			propsOf(
				[
					`type Size = 'xs' | 'sm' | 'md' | 'lg'`,
					`function Foo(props: { size?: Size }) { return null }`,
				].join('\n'),
			),
			'size',
		)

		expect(p.type).toBe(`'xs' | 'sm' | 'md' | 'lg'`)
		expect(p.references).toBeUndefined()
	})

	it('keeps a `boolean`-mixed union as an alias with a reference card', () => {
		const p = prop(
			propsOf(
				[
					`const k = { default: 0, subtle: 1, strong: 2 } as const`,
					`type BoxOutline = boolean | keyof typeof k`,
					`function Foo(props: { outline?: BoxOutline }) { return null }`,
				].join('\n'),
			),
			'outline',
		)

		// Not a pure literal union — boolean is present — so it is not inlined.
		expect(p.type).toBe('BoxOutline')
		expect(p.references?.BoxOutline).toBeDefined()
	})

	it('leaves inline anonymous unions to the formatter (no references)', () => {
		const p = prop(
			propsOf(`function Foo(props: { align?: 'start' | 'center' | 'end' }) { return null }`),
			'align',
		)

		expect(p.type).toContain(`'start'`)
		expect(p.type).toContain(`'center'`)
		expect(p.type).toContain(`'end'`)
		expect(p.references).toBeUndefined()
	})

	it('keeps mapped-type props as authored source text', () => {
		const p = prop(
			propsOf(`function Foo(props: { flags?: { [K in 'a' | 'b']?: boolean } }) { return null }`),
			'flags',
		)

		expect(p.type).toContain('[K in')
	})

	it('renders a node_modules-typed prop by name with no reference card', () => {
		const p = prop(
			propsOf({
				'node_modules/dep.ts': `export type Dep = { value: string }`,
				'index.ts': [
					`import type { Dep } from './node_modules/dep'`,
					`function Foo(props: { content?: Dep }) { return null }`,
				].join('\n'),
			}),
			'content',
		)

		// A node_modules alias renders by name but is never pinned to authored
		// text, so it surfaces no reference card — the project-only gate. A
		// project alias in its place would yield a `Dep` reference card.
		expect(p.type).toBe('Dep')
		expect(p.references).toBeUndefined()
	})
})
