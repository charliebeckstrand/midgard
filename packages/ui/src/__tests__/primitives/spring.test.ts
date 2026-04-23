import { describe, expect, it } from 'vitest'
import { springProps } from '../../primitives/spring'

describe('springProps', () => {
	it('returns whileTap and transition when enabled', () => {
		const result = springProps(true)

		expect(result).toHaveProperty('whileTap')
		expect(result).toHaveProperty('transition')
		expect(result).toHaveProperty('whileTap', { scale: 0.95 })
	})

	it('returns empty object when disabled', () => {
		const result = springProps(false)

		expect(result).toEqual({})
	})

	it('defaults to enabled', () => {
		const result = springProps()

		expect(result).toHaveProperty('whileTap')
		expect(result).toHaveProperty('transition')
	})
})
