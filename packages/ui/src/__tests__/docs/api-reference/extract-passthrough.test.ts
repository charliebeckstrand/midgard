import { describe, expect, it } from 'vitest'
import { extractPassThrough } from '../../../docs/api-reference/engine/extract-passthrough'
import { createInMemoryProgram, firstTypeAlias } from './helpers'

function annotation(sources: Record<string, string>, alias: string) {
	const program = createInMemoryProgram(sources)

	const sf = program.sourceFiles['index.ts']

	if (!sf) throw new Error('index.ts not found in program')

	return { node: firstTypeAlias(sf, alias), checker: program.checker }
}

describe('extractPassThrough — ComponentPropsWithoutRef-style', () => {
	it('detects a direct ComponentPropsWithoutRef pass-through', () => {
		const { node, checker } = annotation(
			{
				'index.ts': [
					`import type { ComponentPropsWithoutRef } from 'react'`,
					`type FooProps = ComponentPropsWithoutRef<'button'>`,
					`export type _Use = FooProps`,
				].join('\n'),
			},
			'FooProps',
		)

		expect(extractPassThrough(node, checker)).toEqual([{ element: 'button' }])
	})

	it('detects ComponentPropsWithRef variants too', () => {
		const { node, checker } = annotation(
			{
				'index.ts': [
					`import type { ComponentPropsWithRef } from 'react'`,
					`type FooProps = ComponentPropsWithRef<'a'>`,
					`export type _Use = FooProps`,
				].join('\n'),
			},
			'FooProps',
		)

		expect(extractPassThrough(node, checker)).toEqual([{ element: 'a' }])
	})
})

describe('extractPassThrough — HTMLAttributes-style', () => {
	it('extracts the HTML tag from HTMLDivElement', () => {
		const { node, checker } = annotation(
			{
				'index.ts': [
					`import type { HTMLAttributes } from 'react'`,
					`type FooProps = HTMLAttributes<HTMLDivElement>`,
					`export type _Use = FooProps`,
				].join('\n'),
			},
			'FooProps',
		)

		expect(extractPassThrough(node, checker)).toEqual([{ element: 'div' }])
	})

	it('extracts the HTML tag from ButtonHTMLAttributes<HTMLButtonElement>', () => {
		const { node, checker } = annotation(
			{
				'index.ts': [
					`import type { ButtonHTMLAttributes } from 'react'`,
					`type FooProps = ButtonHTMLAttributes<HTMLButtonElement>`,
					`export type _Use = FooProps`,
				].join('\n'),
			},
			'FooProps',
		)

		expect(extractPassThrough(node, checker)).toEqual([{ element: 'button' }])
	})

	it('maps overridden class names to their canonical tag (HTMLHeadingElement → h1)', () => {
		const { node, checker } = annotation(
			{
				'index.ts': [
					`import type { HTMLAttributes } from 'react'`,
					`type FooProps = HTMLAttributes<HTMLHeadingElement>`,
					`export type _Use = FooProps`,
				].join('\n'),
			},
			'FooProps',
		)

		expect(extractPassThrough(node, checker)).toEqual([{ element: 'h1' }])
	})

	it('maps HTMLAnchorElement → a (capital-A class, lowercased tag is "anchor" without override)', () => {
		const { node, checker } = annotation(
			{
				'index.ts': [
					`import type { HTMLAttributes } from 'react'`,
					`type FooProps = HTMLAttributes<HTMLAnchorElement>`,
					`export type _Use = FooProps`,
				].join('\n'),
			},
			'FooProps',
		)

		expect(extractPassThrough(node, checker)).toEqual([{ element: 'a' }])
	})
})

describe('extractPassThrough — Omit + Intersection', () => {
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

	it('walks each arm of an intersection', () => {
		const { node, checker } = annotation(
			{
				'index.ts': [
					`import type { ComponentPropsWithoutRef } from 'react'`,
					`type FooProps = ComponentPropsWithoutRef<'button'> & { size?: 'sm' | 'md' }`,
					`export type _Use = FooProps`,
				].join('\n'),
			},
			'FooProps',
		)

		expect(extractPassThrough(node, checker)).toEqual([{ element: 'button' }])
	})

	it('skips Pick — pass-through inside Pick is not what we want to surface', () => {
		const { node, checker } = annotation(
			{
				'index.ts': [
					`import type { ComponentPropsWithoutRef } from 'react'`,
					`type FooProps = Pick<ComponentPropsWithoutRef<'button'>, 'id' | 'onClick'>`,
					`export type _Use = FooProps`,
				].join('\n'),
			},
			'FooProps',
		)

		expect(extractPassThrough(node, checker)).toEqual([])
	})

	it('follows project type aliases through to their pass-through RHS', () => {
		const { node, checker } = annotation(
			{
				'index.ts': [
					`import type { ComponentPropsWithoutRef } from 'react'`,
					`type ButtonHTMLProps = ComponentPropsWithoutRef<'button'>`,
					`type FooProps = ButtonHTMLProps & { size?: 'sm' }`,
					`export type _Use = FooProps`,
				].join('\n'),
			},
			'FooProps',
		)

		expect(extractPassThrough(node, checker)).toEqual([{ element: 'button' }])
	})

	it('returns an empty array when no pass-through is present', () => {
		const { node, checker } = annotation(
			{
				'index.ts': [
					`type FooProps = { size?: 'sm' | 'md'; disabled?: boolean }`,
					`export type _Use = FooProps`,
				].join('\n'),
			},
			'FooProps',
		)

		expect(extractPassThrough(node, checker)).toEqual([])
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
