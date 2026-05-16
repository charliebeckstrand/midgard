import { describe, expect, it } from 'vitest'
import { extractCvaDefaults } from '../../../docs/component-api/extract-cva-defaults'
import { createInMemoryProgram, firstTypeAlias } from './helpers'

function cvaDefaults(sources: Record<string, string>, alias: string): Map<string, string> {
	const program = createInMemoryProgram(sources)

	const sf = program.sourceFiles['index.ts']

	if (!sf) throw new Error('index.ts not found')

	return extractCvaDefaults(firstTypeAlias(sf, alias), program.checker)
}

describe('extractCvaDefaults', () => {
	it('reads defaultVariants out of a tv({ … }) recipe via VariantProps<typeof recipe>', () => {
		const defaults = cvaDefaults(
			{
				'index.ts': [
					`type VariantProps<T> = { size?: 'sm' | 'md' }`,
					`declare function tv<T>(config: T): T`,
					`const recipe = tv({ defaultVariants: { size: 'md' } })`,
					`type FooProps = VariantProps<typeof recipe>`,
					`export type _Use = FooProps`,
				].join('\n'),
			},
			'FooProps',
		)

		expect(defaults.get('size')).toBe(`'md'`)
	})

	it('captures multiple variant defaults from one recipe', () => {
		const defaults = cvaDefaults(
			{
				'index.ts': [
					`type VariantProps<T> = T`,
					`declare function tv<T>(config: T): T`,
					`const recipe = tv({`,
					`	defaultVariants: { size: 'md', color: 'zinc', loading: false },`,
					`})`,
					`type FooProps = VariantProps<typeof recipe>`,
					`export type _Use = FooProps`,
				].join('\n'),
			},
			'FooProps',
		)

		expect([...defaults.entries()].sort()).toEqual(
			[
				['size', `'md'`],
				['color', `'zinc'`],
				['loading', `false`],
			].sort(),
		)
	})

	it('follows a project alias chain (typeof recipe → alias → VariantProps)', () => {
		const defaults = cvaDefaults(
			{
				'index.ts': [
					`type VariantProps<T> = T`,
					`declare function tv<T>(config: T): T`,
					`const recipe = tv({ defaultVariants: { size: 'lg' } })`,
					`type RecipeType = typeof recipe`,
					`type FooProps = VariantProps<RecipeType>`,
					`export type _Use = FooProps`,
				].join('\n'),
			},
			'FooProps',
		)

		expect(defaults.get('size')).toBe(`'lg'`)
	})

	it('unwraps `as const` / `satisfies` around the recipe config', () => {
		const defaults = cvaDefaults(
			{
				'index.ts': [
					`type VariantProps<T> = T`,
					`declare function tv<T>(config: T): T`,
					`const recipe = tv({ defaultVariants: { size: 'sm' } } as const)`,
					`type FooProps = VariantProps<typeof recipe>`,
					`export type _Use = FooProps`,
				].join('\n'),
			},
			'FooProps',
		)

		expect(defaults.get('size')).toBe(`'sm'`)
	})

	it('resolves indirect tv(config) where config is a separate variable', () => {
		const defaults = cvaDefaults(
			{
				'index.ts': [
					`type VariantProps<T> = T`,
					`declare function tv<T>(config: T): T`,
					`const config = { defaultVariants: { size: 'md' } }`,
					`const recipe = tv(config)`,
					`type FooProps = VariantProps<typeof recipe>`,
					`export type _Use = FooProps`,
				].join('\n'),
			},
			'FooProps',
		)

		expect(defaults.get('size')).toBe(`'md'`)
	})

	it('returns an empty map when the annotation has no VariantProps reference', () => {
		const defaults = cvaDefaults(
			{
				'index.ts': [`type FooProps = { size?: 'sm' | 'md' }`, `export type _Use = FooProps`].join(
					'\n',
				),
			},
			'FooProps',
		)

		expect(defaults.size).toBe(0)
	})

	it('returns an empty map when the recipe has no defaultVariants block', () => {
		const defaults = cvaDefaults(
			{
				'index.ts': [
					`type VariantProps<T> = T`,
					`declare function tv<T>(config: T): T`,
					`const recipe = tv({ variants: { size: { sm: 'a', md: 'b' } } })`,
					`type FooProps = VariantProps<typeof recipe>`,
					`export type _Use = FooProps`,
				].join('\n'),
			},
			'FooProps',
		)

		expect(defaults.size).toBe(0)
	})
})
