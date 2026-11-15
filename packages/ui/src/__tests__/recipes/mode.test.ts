// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { defineColors, mode } from '../../core/recipe'

describe('mode', () => {
	it('concatenates light and dark in light-first order when both are provided', () => {
		// Light-first order: `dark:` variants land after their base for correct cascade.
		expect(mode('text-zinc-900', 'dark:text-white')).toEqual(['text-zinc-900', 'dark:text-white'])
	})

	it('spreads an array in either argument', () => {
		expect(mode(['bg-white', 'hover:bg-zinc-50'], ['dark:bg-black'])).toEqual([
			'bg-white',
			'hover:bg-zinc-50',
			'dark:bg-black',
		])
	})
})

describe('defineColors', () => {
	it('spreads the arrays of a pair entry', () => {
		expect(
			defineColors({
				composite: {
					light: ['bg-white', 'border-zinc-200'],
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
