import { describe, expect, it } from 'vitest'
import { shades } from '../../core/recipe'

describe('shades', () => {
	it('wraps a plain string entry in a single-element array', () => {
		// Static tokens (one class for both modes) skip the tuple form.
		const out = shades({
			zinc: 'text-zinc-700',
			red: 'text-red-700',
			amber: 'text-amber-700',
			green: 'text-green-700',
			blue: 'text-blue-700',
		})

		expect(out).toEqual({
			zinc: ['text-zinc-700'],
			red: ['text-red-700'],
			amber: ['text-amber-700'],
			green: ['text-green-700'],
			blue: ['text-blue-700'],
		})
	})

	it("spreads a [light, dark] tuple into the colour's class array", () => {
		const out = shades({
			zinc: ['text-zinc-700', 'dark:text-zinc-400'],
			red: ['text-red-700', 'dark:text-red-300'],
			amber: 'text-amber-700',
			green: 'text-green-700',
			blue: 'text-blue-700',
		})

		expect(out.zinc).toEqual(['text-zinc-700', 'dark:text-zinc-400'])

		expect(out.red).toEqual(['text-red-700', 'dark:text-red-300'])

		expect(out.amber).toEqual(['text-amber-700'])
	})

	it('copies the tuple rather than aliasing it on the output', () => {
		// `shades` spreads the tuple, so a downstream caller mutating the
		// output array can't leak into the source spec.
		const tuple = ['text-zinc-700', 'dark:text-zinc-400'] as const

		const out = shades({
			zinc: tuple,
			red: 'text-red-700',
			amber: 'text-amber-700',
			green: 'text-green-700',
			blue: 'text-blue-700',
		})

		expect(out.zinc).not.toBe(tuple)

		expect(out.zinc).toEqual([...tuple])
	})
})
