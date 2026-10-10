import { describe, expect, it, vi } from 'vitest'
import { mergePlaces } from '../../queries/places-queries'
import { place } from '../fixtures'

vi.mock('../../api/places-api', () => ({}))

describe('mergePlaces', () => {
	it('replaces a stored place in its position, and puts a new place first', () => {
		const held = [place('a'), place('b')]

		const edited = place('b', { name: 'Edited' })

		const added = place('c')

		expect(mergePlaces(held, [edited, added])).toEqual([added, held[0], edited])
	})
})
