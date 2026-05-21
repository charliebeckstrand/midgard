import { describe, expect, it } from 'vitest'
import { extractProjectPropNames } from '../../../docs/api-reference/engine/extract-project-props'
import { createInMemoryProgram, firstTypeAlias } from './helpers'

function projectNames(sources: Record<string, string>, alias: string): Set<string> {
	const program = createInMemoryProgram(sources)

	const sf = program.sourceFiles['index.ts']

	if (!sf) throw new Error('index.ts not found')

	return extractProjectPropNames(firstTypeAlias(sf, alias), program.checker)
}

describe('extractProjectPropNames', () => {
	it('collects every key from an inline type literal', () => {
		const names = projectNames(
			{
				'index.ts': [
					`type FooProps = { size?: 'sm' | 'md'; disabled?: boolean; label: string }`,
					`export type _Use = FooProps`,
				].join('\n'),
			},
			'FooProps',
		)

		expect([...names].sort()).toEqual(['disabled', 'label', 'size'])
	})

	it('skips recognized pass-through arms — only project-authored keys survive', () => {
		const names = projectNames(
			{
				'index.ts': [
					`import type { ComponentPropsWithoutRef } from 'react'`,
					`type FooProps = ComponentPropsWithoutRef<'button'> & { size?: 'sm' | 'md' }`,
					`export type _Use = FooProps`,
				].join('\n'),
			},
			'FooProps',
		)

		expect([...names]).toEqual(['size'])
	})

	it('exposes `href` from a PolymorphicProps arm (the polymorphism discriminator)', () => {
		const names = projectNames(
			{
				'index.ts': [
					`type PolymorphicProps<T extends string> = { as?: T }`,
					`type LinkProps = PolymorphicProps<'a'> & { disabled?: boolean }`,
					`export type _Use = LinkProps`,
				].join('\n'),
			},
			'LinkProps',
		)

		expect(names.has('href')).toBe(true)
		expect(names.has('disabled')).toBe(true)
	})

	it("recurses into Omit<T, …> to surface T's project-authored keys", () => {
		const names = projectNames(
			{
				'index.ts': [
					`type BaseProps = { size?: 'sm' | 'md'; disabled?: boolean }`,
					`type FooProps = Omit<BaseProps, 'disabled'>`,
					`export type _Use = FooProps`,
				].join('\n'),
			},
			'FooProps',
		)

		expect(names.has('size')).toBe(true)
	})

	it('collects literal keys listed inside Pick<T, K>', () => {
		const names = projectNames(
			{
				'index.ts': [
					`type Wide = { size?: string; color?: string; label?: string }`,
					`type FooProps = Pick<Wide, 'size' | 'label'>`,
					`export type _Use = FooProps`,
				].join('\n'),
			},
			'FooProps',
		)

		expect([...names].sort()).toEqual(['label', 'size'])
	})

	it('follows project type aliases whose RHS is splittable', () => {
		const names = projectNames(
			{
				'index.ts': [
					`type Inner = { foo?: string; bar?: number }`,
					`type FooProps = Inner & { extra?: boolean }`,
					`export type _Use = FooProps`,
				].join('\n'),
			},
			'FooProps',
		)

		expect([...names].sort()).toEqual(['bar', 'extra', 'foo'])
	})

	it('drops the entire branch when an alias resolves to a pass-through reference', () => {
		const names = projectNames(
			{
				'index.ts': [
					`import type { ComponentPropsWithoutRef } from 'react'`,
					`type ButtonAttrs = ComponentPropsWithoutRef<'button'>`,
					`type FooProps = ButtonAttrs & { size?: 'sm' }`,
					`export type _Use = FooProps`,
				].join('\n'),
			},
			'FooProps',
		)

		expect([...names]).toEqual(['size'])
	})

	it('recurses into Extract<T, U> rather than expanding the resolved type', () => {
		const names = projectNames(
			{
				'index.ts': [
					`import type { ComponentPropsWithoutRef } from 'react'`,
					`type Poly = ({ href?: never } & ComponentPropsWithoutRef<'button'>) | ({ href: string } & { rel?: string })`,
					`type FooProps = Extract<Poly, { href?: never }> & { size?: 'sm' }`,
					`export type _Use = FooProps`,
				].join('\n'),
			},
			'FooProps',
		)

		expect(names.has('size')).toBe(true)
		expect([...names].some((n) => n.startsWith('aria-'))).toBe(false)
	})

	it('walks union members', () => {
		const names = projectNames(
			{
				'index.ts': [
					`type FooProps = { mode: 'a'; valueA: string } | { mode: 'b'; valueB: number }`,
					`export type _Use = FooProps`,
				].join('\n'),
			},
			'FooProps',
		)

		expect([...names].sort()).toEqual(['mode', 'valueA', 'valueB'])
	})
})
