import { describe, expect, it, vi } from 'vitest'
import { mergeById } from '../../queries/places-queries'
import { place } from '../fixtures'

vi.mock('../../api/places-api', () => ({}))

describe('mergeById', () => {
	it('replaces a stored record in its position, and puts a new record first', () => {
		const held = [place('a'), place('b')]

		const edited = place('b', { name: 'Edited' })

		const added = place('c')

		expect(mergeById(held, [edited, added])).toEqual([added, held[0], edited])

		expect(mergeById(undefined, [added])).toEqual([added])
	})
})
