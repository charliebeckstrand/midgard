// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { selectedRegionIndices } from '../../modules/map/engine/map-region/identity'

describe('selectedRegionIndices', () => {
	it('gives the feature index of each selected id, in ascending order and each one time', () => {
		expect(selectedRegionIndices(['A', 'B', 'C'], ['C', 'A', 'C'])).toEqual([0, 2])
	})

	it('gives the first feature where two features share an identity, as `indexOf` does', () => {
		expect(selectedRegionIndices(['A', 'B', 'A'], ['A'])).toEqual([0])
	})

	it('gives nothing for an id that names no feature, never region 0', () => {
		expect(selectedRegionIndices(['A', 'B'], ['Z'])).toEqual([])
	})

	it('gives one reference for every empty result, so a memo below holds', () => {
		const ids = ['A', 'B']

		expect(selectedRegionIndices(ids, [])).toBe(selectedRegionIndices(ids, ['Z']))
	})
})
