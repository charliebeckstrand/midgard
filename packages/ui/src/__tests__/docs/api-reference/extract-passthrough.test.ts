import { describe, expect, it } from 'vitest'
import { extractPassThrough } from '../../../docs/api-reference/engine/extract-passthrough'
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
