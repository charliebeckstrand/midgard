import { describe, expect, it, vi } from 'vitest'
import { matchesMediaQuery, subscribeMediaQuery } from '../../utilities/media-query'

describe('media-query on a platform with no matchMedia', () => {
	it('matches no query', () => {
		vi.stubGlobal('matchMedia', undefined)

		expect(matchesMediaQuery('(min-width: 40rem)')).toBe(false)
	})

	it('subscribes and unsubscribes, and matches no query while subscribed', () => {
		vi.stubGlobal('matchMedia', undefined)

		const unsubscribe = subscribeMediaQuery('(min-width: 40rem)', () => {})

		expect(matchesMediaQuery('(min-width: 40rem)')).toBe(false)

		expect(unsubscribe).not.toThrow()
	})
})
