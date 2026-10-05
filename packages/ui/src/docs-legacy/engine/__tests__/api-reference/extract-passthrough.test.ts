// @vitest-environment node
import { ts } from 'ts-morph'
import { describe, expect, it } from 'vitest'
import { extractPassThrough } from '../../api-reference/engine/extract-passthrough'
import { createInMemoryProgram, firstTypeAlias } from './helpers'

function annotation(sources: Record<string, string>, alias: string) {
	const program = createInMemoryProgram(sources)

	const sf = program.sourceFiles['index.ts']

	if (!sf) throw new Error('index.ts not found in program')

	return { node: firstTypeAlias(sf, alias), checker: program.checker }
}

function passThroughOf(lines: string[]): ReturnType<typeof extractPassThrough> {
	const { node, checker } = annotation({ 'index.ts': lines.join('\n') }, 'FooProps')

	return extractPassThrough(node, checker)
}

describe('extractPassThrough — ComponentPropsWithoutRef-style', () => {
	it.each<[string, string[], ReturnType<typeof extractPassThrough>]>([
		[
			'detects a direct ComponentPropsWithoutRef pass-through',
			[
				`import type { ComponentPropsWithoutRef } from 'react'`,
				`type FooProps = ComponentPropsWithoutRef<'button'>`,
				`export type _Use = FooProps`,
			],
			[{ element: 'button' }],
		],
		[
			'detects ComponentPropsWithRef variants too',
			[
				`import type { ComponentPropsWithRef } from 'react'`,
				`type FooProps = ComponentPropsWithRef<'a'>`,
				`export type _Use = FooProps`,
			],
			[{ element: 'a' }],
		],
	])('%s', (_name, lines, expected) => {
		expect(passThroughOf(lines)).toEqual(expected)
	})
})

describe('extractPassThrough — HTMLAttributes-style', () => {
	it.each<[string, string[], ReturnType<typeof extractPassThrough>]>([
		[
			'extracts the HTML tag from HTMLDivElement',
			[
				`import type { HTMLAttributes } from 'react'`,
				`type FooProps = HTMLAttributes<HTMLDivElement>`,
				`export type _Use = FooProps`,
			],
			[{ element: 'div' }],
		],
		[
			'extracts the HTML tag from ButtonHTMLAttributes<HTMLButtonElement>',
			[
				`import type { ButtonHTMLAttributes } from 'react'`,
				`type FooProps = ButtonHTMLAttributes<HTMLButtonElement>`,
				`export type _Use = FooProps`,
			],
			[{ element: 'button' }],
		],
		[
			'maps overridden class names to their canonical tag (HTMLHeadingElement → h1)',
			[
				`import type { HTMLAttributes } from 'react'`,
				`type FooProps = HTMLAttributes<HTMLHeadingElement>`,
				`export type _Use = FooProps`,
			],
			[{ element: 'h1' }],
		],
		[
			'maps HTMLAnchorElement → a (capital-A class, lowercased tag is "anchor" without override)',
			[
				`import type { HTMLAttributes } from 'react'`,
				`type FooProps = HTMLAttributes<HTMLAnchorElement>`,
				`export type _Use = FooProps`,
			],
			[{ element: 'a' }],
		],
	])('%s', (_name, lines, expected) => {
		expect(passThroughOf(lines)).toEqual(expected)
	})
})

describe('extractPassThrough — Omit + Intersection', () => {
	it.each<[string, string[], ReturnType<typeof extractPassThrough>]>([
		[
			'walks each arm of an intersection',
			[
				`import type { ComponentPropsWithoutRef } from 'react'`,
				`type FooProps = ComponentPropsWithoutRef<'button'> & { size?: 'sm' | 'md' }`,
				`export type _Use = FooProps`,
			],
			[{ element: 'button' }],
		],
		[
			'skips Pick — pass-through inside Pick is not what we want to surface',
			[
				`import type { ComponentPropsWithoutRef } from 'react'`,
				`type FooProps = Pick<ComponentPropsWithoutRef<'button'>, 'id' | 'onClick'>`,
				`export type _Use = FooProps`,
			],
			[],
		],
		[
			'follows project type aliases through to their pass-through RHS',
			[
				`import type { ComponentPropsWithoutRef } from 'react'`,
				`type ButtonHTMLProps = ComponentPropsWithoutRef<'button'>`,
				`type FooProps = ButtonHTMLProps & { size?: 'sm' }`,
				`export type _Use = FooProps`,
			],
			[{ element: 'button' }],
		],
		[
			'returns an empty array when no pass-through is present',
			[`type FooProps = { size?: 'sm' | 'md'; disabled?: boolean }`, `export type _Use = FooProps`],
			[],
		],
	])('%s', (_name, lines, expected) => {
		expect(passThroughOf(lines)).toEqual(expected)
	})

	it('records omitted keys when wrapped in Omit<…, …>', () => {
		const { node, checker } = annotation(
			{
				'index.ts': [
					`import type { ComponentPropsWithoutRef } from 'react'`,
					`type FooProps = Omit<ComponentPropsWithoutRef<'button'>, 'onClick' | 'type'>`,
					`export type _Use = FooProps`,
				].join('\n'),
			},
			'FooProps',
		)

		const out = extractPassThrough(node, checker)

		expect(out).toHaveLength(1)

		expect(out[0]?.element).toBe('button')

		expect(out[0]?.omitted?.sort()).toEqual(['onClick', 'type'].sort())
	})

	it('dedupes repeat appearances of the same element, merging omitted keys', () => {
		const { node, checker } = annotation(
			{
				'index.ts': [
					`import type { ComponentPropsWithoutRef } from 'react'`,
					`type A = Omit<ComponentPropsWithoutRef<'button'>, 'onClick'>`,
					`type B = Omit<ComponentPropsWithoutRef<'button'>, 'type'>`,
					`type FooProps = A & B`,
					`export type _Use = FooProps`,
				].join('\n'),
			},
			'FooProps',
		)

		const out = extractPassThrough(node, checker)

		expect(out).toHaveLength(1)

		expect(out[0]?.element).toBe('button')

		expect(out[0]?.omitted?.sort()).toEqual(['onClick', 'type'].sort())
	})
})

describe('extractPassThrough — type parameters and components', () => {
	const polymorphic = [
		`import type { ComponentProps } from 'react'`,
		`type Poly<F extends string, O extends PropertyKey = never> =`,
		`  | ({ href?: never } & Omit<ComponentProps<F>, 'className' | O>)`,
		`  | ({ href: string } & Omit<ComponentProps<'a'>, 'className' | O>)`,
	]

	it('binds the tag and the omitted keys of a generic alias to its arguments', () => {
		const lines = [...polymorphic, `type FooProps = Poly<'span', 'prefix'>`]

		expect(passThroughOf(lines)).toEqual([
			{ element: 'span', omitted: ['className', 'prefix'] },
			{ element: 'a', omitted: ['className', 'prefix'] },
		])
	})

	it('binds a parameter that the reference leaves out to its default', () => {
		const lines = [...polymorphic, `type FooProps = Poly<'div'>`]

		expect(passThroughOf(lines)).toEqual([
			{ element: 'div', omitted: ['className'] },
			{ element: 'a', omitted: ['className'] },
		])
	})

	it("reads a component's own type parameter through its default", () => {
		const program = createInMemoryProgram({
			'index.ts': [
				...polymorphic,
				`export function Item<F extends string = 'li'>(props: Poly<F>) { return null }`,
			].join('\n'),
		})

		const item = program.sourceFiles['index.ts']?.statements.find(ts.isFunctionDeclaration)

		const node = item?.parameters[0]?.type

		if (!node) throw new Error('no props annotation')

		expect(extractPassThrough(node, program.checker).map(({ element }) => element)).toEqual([
			'li',
			'a',
		])
	})

	it('reads `ComponentProps<typeof X>` through the props annotation of X', () => {
		const lines = [
			`import type { ComponentProps } from 'react'`,
			`function Panel(props: Omit<ComponentProps<'section'>, 'title'> & { value?: string }) {`,
			`  return null`,
			`}`,
			`type FooProps = Omit<ComponentProps<typeof Panel>, 'value'>`,
		]

		expect(passThroughOf(lines)).toEqual([{ element: 'section', omitted: ['value', 'title'] }])
	})

	it('reads through a props wrapper to its argument', () => {
		const lines = [
			`import type { ComponentProps, PropsWithoutRef } from 'react'`,
			`type FooProps = PropsWithoutRef<ComponentProps<'input'>>`,
		]

		expect(passThroughOf(lines)).toEqual([{ element: 'input' }])
	})
})
