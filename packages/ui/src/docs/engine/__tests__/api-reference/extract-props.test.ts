// @vitest-environment node
import { ts } from 'ts-morph'
import { describe, expect, it } from 'vitest'
import { extractProps } from '../../api-reference/engine/extract-props'
import type { PropDef } from '../../api-reference/types'
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
	projectNames: ReadonlySet<string> | null = null,
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

	return extractProps(fn, propsType, projectNames, defaults, checker)
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

	it('gives a reference card to an alias that the component file does not import', () => {
		const p = prop(
			propsOf({
				'types.ts': [
					`export type Anchor = { x: number; y: number }`,
					`export type FooProps = { anchor?: Anchor }`,
				].join('\n'),
				'index.ts': [
					`import type { FooProps } from './types'`,
					`function Foo(props: FooProps) { return null }`,
				].join('\n'),
			}),
			'anchor',
		)

		// `Anchor` is in scope where the prop is declared, not where `Foo` is.
		expect(p.type).toBe('Anchor')

		expect(p.references?.Anchor).toContain('x: number')
	})

	it('shows the intersected type of a prop that two intersection arms declare', () => {
		const props = propsOf(
			[
				`type Html = { color?: string; max?: number | string }`,
				`function Foo(props: Html & { color?: 'red' | 'blue'; max?: number }) { return null }`,
			].join('\n'),
		)

		// The component accepts only the intersection. Each arm's own type is wider.
		expect(prop(props, 'color').type).toBe(`'red' | 'blue'`)

		expect(prop(props, 'max').type).toBe('number')
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

describe('extractProps — order', () => {
	it('lists the props in the order of the project names', () => {
		const props = propsOf(
			`function Foo(props: { a?: string; b?: string; c?: string }) { return null }`,
			new Map(),
			new Set(['c', 'a', 'b']),
		)

		expect(props.map((p) => p.name)).toEqual(['c', 'a', 'b'])
	})

	// `w` makes the checker meet `'a'` before `'b'`, so its order puts `'a'`
	// first.
	it('orders the members of all the arms of a prop by its source', () => {
		const props = propsOf(
			[
				`type Single = { w?: 'a'; value?: 'b' | 'a' | null }`,
				`type Multiple = { w?: 'a'; value?: string[] }`,
				`function Foo(props: Single | Multiple) { return null }`,
			].join('\n'),
		)

		expect(prop(props, 'value').type).toBe(`'b' | 'a' | null | string[]`)
	})
})

describe('extractProps — which props show', () => {
	const names = (source: string) => propsOf(source).map((p) => p.name)

	it('keeps a string-literal prop name', () => {
		expect(names(`function Foo(props: { 'aria-label'?: string }) { return null }`)).toEqual([
			'aria-label',
		])
	})

	it('drops a `data-*` attribute, a hook for selectors and not an option', () => {
		const source = `function Foo(props: { 'data-slot'?: string; size?: string }) { return null }`

		expect(names(source)).toEqual(['size'])
	})

	it('drops a prop whose own doc comment is `@internal`', () => {
		const source = [
			`function Foo(props: {`,
			`  /** @internal */`,
			`  stamp?: string`,
			`  size?: string`,
			`}) { return null }`,
		].join('\n')

		expect(names(source)).toEqual(['size'])
	})

	// ui tags a props type `@internal` when no barrel exports it, and its props
	// are still API.
	it('keeps the props of a type whose own doc comment is `@internal`', () => {
		const source = [
			`/** @internal */`,
			`type SingleProps = { type?: 'single' }`,
			`function Foo(props: SingleProps) { return null }`,
		].join('\n')

		expect(names(source)).toEqual(['type'])
	})

	it('keeps `children` of a narrower type than any node', () => {
		const p = prop(propsOf(`function Foo(props: { children: string }) { return null }`), 'children')

		expect(p.type).toBe('string')
	})

	it('drops `children` that takes any node, or none', () => {
		// The in-memory program resolves no `react`, so a local alias stands in.
		const source = (type: string) => [
			`type ReactNode = string | number | boolean | null | undefined`,
			`function Foo(props: { children?: ${type} }) { return null }`,
		]

		for (const type of ['ReactNode', 'ReactNode | undefined', 'never']) {
			expect(names(source(type).join('\n'))).toEqual([])
		}
	})

	it('prints a union that names `ReactNode` as authored', () => {
		const p = prop(
			propsOf(
				[
					`import type { ReactNode } from 'react'`,
					`function Foo(props: { children: ReactNode | ((open: boolean) => ReactNode) }) { return null }`,
				].join('\n'),
			),
			'children',
		)

		expect(p.type).toBe('ReactNode | ((open: boolean) => ReactNode)')
	})
})

describe('extractProps — discriminated unions', () => {
	// A prop shared by every arm is collected both as the parent union's merged
	// property and as each arm's slice; the merged superset must not double the
	// rendering (`false | true | Config | false | true | Config`).
	const SRC = [
		`type Config = { years?: number[] | boolean }`,
		`type Base = { name?: string }`,
		`type Single = { kind?: false; value?: number }`,
		`type Range = { kind?: false; value?: [number, number] }`,
		`type Period = {`,
		`  /** Config or bare true. */`,
		`  kind: true | Config`,
		`  value?: Config`,
		`}`,
		`type Props = Base & (Single | Range | Period)`,
		`function Foo(props: Props) { return null }`,
	].join('\n')

	it('folds an all-arm prop into a single union, collapsing the boolean pair', () => {
		const p = prop(propsOf(SRC), 'kind')

		// `false` (Single/Range) and `true` (Period) collect as separate arms;
		// the merge must re-fold them to `boolean` rather than `false | true`.
		expect(p.type).toBe('boolean | Config')
	})

	it('keeps the documented arm description and the alias reference card', () => {
		const p = prop(propsOf(SRC), 'kind')

		expect(p.description).toBe('Config or bare true.')

		expect(p.references?.Config).toContain('years?:')
	})

	it('unions the distinct per-arm value types once each', () => {
		const p = prop(propsOf(SRC), 'value')

		expect(p.type).toBe('number | [number, number] | Config')
	})

	it('keeps a wider arm when a narrower arm is a strict subset', () => {
		const p = prop(
			propsOf(
				[
					`type Wide = { tone?: number | string }`,
					`type Narrow = { tone?: number }`,
					`type Props = Wide | Narrow`,
					`function Foo(props: Props) { return null }`,
				].join('\n'),
			),
			'tone',
		)

		// Dropping the merged union must not strip `string`: the wider arm carries
		// a member the narrow arm doesn't, so both survive (order is TS's).
		expect(p.type.split(' | ').sort()).toEqual(['number', 'string'])
	})

	it('parenthesizes function-type arms so the union does not read as one signature', () => {
		const p = prop(
			propsOf(
				[
					`type Single = { onChange?: (value: string) => void }`,
					`type Multi = { onChange?: (value: string[]) => void }`,
					`type Props = Single | Multi`,
					`function Foo(props: Props) { return null }`,
				].join('\n'),
			),
			'onChange',
		)

		expect(p.type).toBe('((value: string) => void) | ((value: string[]) => void)')
	})

	it('drops an arm that contributes only `undefined` instead of rendering it', () => {
		const p = prop(
			propsOf(
				[
					`type On = { onReorder?: (next: number[]) => void }`,
					`type Off = { onReorder?: undefined }`,
					`type Props = On | Off`,
					`function Foo(props: Props) { return null }`,
				].join('\n'),
			),
			'onReorder',
		)

		expect(p.type).toBe('(next: number[]) => void')
	})
})
