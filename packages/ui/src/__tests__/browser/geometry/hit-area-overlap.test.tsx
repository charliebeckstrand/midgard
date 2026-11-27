import { describe, expect, it } from 'vitest'
import { rows } from '../../a11y/cases'
import { renderUI } from '../../helpers'
import { overlappingHitAreas } from './helpers/geometry-invariants'
import { packed, visibleHitAreas } from './helpers/packed-controls'

/**
 * The hit areas of `TouchTarget` at the 24px floor of a fine pointer. Two hit
 * areas that overlap give the later host all of the overlap, so a container of
 * small hosts caps them at its gap (`primitives/touch-target`). The page has a
 * mouse. `coarse/hit-area-overlap.test.tsx` holds the 44px floor of a coarse
 * pointer, and `geometry-invariants.test.tsx` checks the 24px floor over the
 * corpus.
 */
describe('hit areas of packed controls', () => {
	it.each(rows(packed))('%s has no two hit areas that overlap', (_name, { element }) => {
		const { container } = renderUI(element)

		// The case must lay out a cluster, else it checks nothing.
		expect(visibleHitAreas(container)).toBeGreaterThanOrEqual(2)

		expect(overlappingHitAreas(container)).toEqual([])
	})
})
