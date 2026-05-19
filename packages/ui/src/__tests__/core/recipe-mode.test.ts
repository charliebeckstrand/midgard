import { describe, expect, it } from 'vitest'
import { defineColors, mode } from '../../core/recipe/mode'

describe('mode', () => {
	it('returns just the light value when no dark is provided', () => {
		expect(mode('text-zinc-900')).toEqual(['text-zinc-900'])
	})

	it('concatenates the light and dark values when both are provided', () => {
		expect(mode('text-zinc-900', 'dark:text-white')).toEqual(['text-zinc-900', 'dark:text-white'])
	})

	it('flattens nested arrays in the light value', () => {
		expect(mode(['bg-white', ['hover:bg-zinc-50']])).toEqual(['bg-white', 'hover:bg-zinc-50'])
	})

	it('flattens nested arrays in both light and dark values', () => {
		expect(mode(['bg-white'], ['dark:bg-black', ['dark:hover:bg-zinc-900']])).toEqual([
			'bg-white',
			'dark:bg-black',
			'dark:hover:bg-zinc-900',
		])
	})
})

describe('defineColors', () => {
	it('accepts a plain string entry', () => {
		const result = defineColors({ subtle: 'text-zinc-500' })

		expect(result.subtle).toEqual(['text-zinc-500'])
	})

	it('accepts a { light, dark } pair entry', () => {
		const result = defineColors({
			primary: { light: 'text-zinc-900', dark: 'dark:text-white' },
		})

		expect(result.primary).toEqual(['text-zinc-900', 'dark:text-white'])
	})

	it('flattens nested arrays inside a mode pair', () => {
		const result = defineColors({
			composite: {
				light: ['bg-white', ['border-zinc-200']],
				dark: ['dark:bg-black'],
			},
		})

		expect(result.composite).toEqual(['bg-white', 'border-zinc-200', 'dark:bg-black'])
	})

	it('handles a map with mixed plain and pair entries', () => {
		const result = defineColors({
			static: 'text-blue-600',
			adaptive: { light: 'bg-white', dark: 'dark:bg-zinc-900' },
		})

		expect(result.static).toEqual(['text-blue-600'])

		expect(result.adaptive).toEqual(['bg-white', 'dark:bg-zinc-900'])
	})
})
