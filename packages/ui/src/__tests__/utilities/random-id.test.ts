// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'
import { randomId } from '../../utilities/random-id'

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/

describe('randomId', () => {
	it('gives a version 4 UUID', () => {
		expect(randomId()).toMatch(UUID_V4)
	})

	it('gives a version 4 UUID on an origin with no crypto.randomUUID', () => {
		vi.stubGlobal('crypto', { getRandomValues: crypto.getRandomValues.bind(crypto) })

		const ids = Array.from({ length: 50 }, () => randomId())

		for (const id of ids) expect(id).toMatch(UUID_V4)

		expect(new Set(ids).size).toBe(ids.length)
	})
})
