import { describe, expect, it } from 'vitest'
import { merge } from '../../core/recipe'

describe('merge', () => {
	it('concatenates per-key class arrays across every input record', () => {
		const a = { zinc: ['a-zinc'], red: ['a-red'] }
		const b = { zinc: ['b-zinc'], red: ['b-red'] }
		const c = { zinc: ['c-zinc'], red: ['c-red'] }

		expect(merge(a, b, c)).toEqual({
			zinc: ['a-zinc', 'b-zinc', 'c-zinc'],
			red: ['a-red', 'b-red', 'c-red'],
		})
	})

	it('keeps the colour-key order of the first record', () => {
		// Kata code reads bundles like `merge(soft.bg, soft.text, soft.hover)`
		// and feeds them straight into a palette matrix; downstream iteration
		// has to land on `iro.colors`-order keys, which the first record sets.
		const out = merge({ zinc: ['z'], red: ['r'], blue: ['b'] }, { zinc: [], red: [], blue: [] })

		expect(Object.keys(out)).toEqual(['zinc', 'red', 'blue'])
	})

	it('accepts a single record and returns the same per-key contents', () => {
		expect(merge({ zinc: ['hello'], red: ['world'] })).toEqual({
			zinc: ['hello'],
			red: ['world'],
		})
	})

	it('treats an empty class array as a no-op for that colour', () => {
		expect(merge({ zinc: ['a'], red: ['b'] }, { zinc: [], red: ['c'] })).toEqual({
			zinc: ['a'],
			red: ['b', 'c'],
		})
	})
})
