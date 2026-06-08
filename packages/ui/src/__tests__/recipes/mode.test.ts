import { describe, expect, it } from 'vitest'
import { defineColors, mode } from '../../core/recipe'

describe('mode', () => {
	it('returns the light value alone when no dark is provided', () => {
		expect(mode('text-zinc-900')).toEqual(['text-zinc-900'])
	})

	it('concatenates light and dark in light-first order when both are provided', () => {
		// Light-first order: `dark:` variants land after their base for correct cascade.
		expect(mode('text-zinc-900', 'dark:text-white')).toEqual(['text-zinc-900', 'dark:text-white'])
	})

	it('flattens one level of nesting in either argument', () => {
		// Normalises `iro`'s composed sub-arrays into a uniform `string[]`.
		expect(
			mode(['bg-white', ['hover:bg-zinc-50']], ['dark:bg-black', ['dark:hover:bg-zinc-900']]),
		).toEqual(['bg-white', 'hover:bg-zinc-50', 'dark:bg-black', 'dark:hover:bg-zinc-900'])
	})
})

describe('defineColors', () => {
	it('wraps plain string entries in a single-element array', () => {
		expect(defineColors({ subtle: 'text-zinc-500' })).toEqual({ subtle: ['text-zinc-500'] })
	})

	it('concatenates the dark string after the light one for { light, dark } entries', () => {
		expect(
			defineColors({
				primary: { light: 'text-zinc-900', dark: 'dark:text-white' },
			}),
		).toEqual({ primary: ['text-zinc-900', 'dark:text-white'] })
	})

	it('flattens nested arrays inside a pair entry', () => {
		expect(
			defineColors({
				composite: {
					light: ['bg-white', ['border-zinc-200']],
					dark: ['dark:bg-black'],
				},
			}),
		).toEqual({ composite: ['bg-white', 'border-zinc-200', 'dark:bg-black'] })
	})

	it('handles a mix of plain and pair entries in the same call', () => {
		// Plain (single-class) and adaptive (light/dark pair) entries coexist.
		expect(
			defineColors({
				static: 'text-blue-600',
				adaptive: { light: 'bg-white', dark: 'dark:bg-zinc-900' },
			}),
		).toEqual({
			static: ['text-blue-600'],
			adaptive: ['bg-white', 'dark:bg-zinc-900'],
		})
	})
})
