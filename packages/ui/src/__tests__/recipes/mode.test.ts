// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { mode } from '../../core/recipe'

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
