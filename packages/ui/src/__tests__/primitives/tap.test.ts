import { describe, expect, it } from 'vitest'
import { useTap } from '../../primitives/tap'

describe('useTap', () => {
	it('returns whileTap and transition when enabled', () => {
		const result = useTap(true)

		expect(result).toHaveProperty('whileTap')
		expect(result).toHaveProperty('transition')
		expect(result.whileTap).toEqual({ scale: 0.95 })
	})

	it('returns empty object when disabled', () => {
		const result = useTap(false)

		expect(result).toEqual({})
	})

	it('defaults to enabled', () => {
		const result = useTap()

		expect(result).toHaveProperty('whileTap')
		expect(result).toHaveProperty('transition')
	})
})
