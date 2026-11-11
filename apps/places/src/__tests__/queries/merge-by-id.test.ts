import { describe, expect, it, vi } from 'vitest'
import { mergeById } from '../../queries/places-queries'
import { makePlace } from '../fixtures'

vi.mock('../../api/places-api', () => ({}))

describe('mergeById', () => {
	it('replaces a stored record in its position, and puts a new record first', () => {
		const held = [makePlace('a'), makePlace('b')]

		const edited = makePlace('b', { name: 'Edited' })

		const added = makePlace('c')

		expect(mergeById(held, [edited, added])).toEqual([added, held[0], edited])

		expect(mergeById(undefined, [added])).toEqual([added])
	})
})
