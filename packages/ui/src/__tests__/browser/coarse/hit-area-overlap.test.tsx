import { X } from 'lucide-react'
import { describe, expect, it } from 'vitest'
import { Button } from '../../../components/button'
import { Icon } from '../../../components/icon'
import { baseline, rows } from '../../a11y/cases'
import { getSlot, renderUI } from '../../helpers'
import { overlappingHitAreas } from '../geometry/helpers/geometry-invariants'
import { packed, visibleHitAreas } from '../geometry/helpers/packed-controls'

/**
 * The hit areas of `TouchTarget` at the 44px floor of a coarse pointer. Two
 * hit areas that overlap give the later host all of the overlap, so a container
 * of small hosts caps them at its gap (`primitives/touch-target`).
 *
 * The page has a touch screen, so the real `(pointer: coarse)` rules of the CSS
 * lay out each case: the floor, the touch pitch, and each part that shows only
 * to a finger. `geometry/hit-area-overlap.test.tsx` holds the 24px floor of a
 * fine pointer.
 */
describe('hit areas at the coarse floor', () => {
	it('lays out the 44px floor on each span', () => {
		const { container } = renderUI(
			<div style={{ padding: 64 }}>
				<Button variant="bare" aria-label="Close">
					<Icon icon={<X />} />
				</Button>
			</div>,
		)

		const span = getSlot(container, 'touch-target')

		// On a fine pointer, the 24px bare box keeps the 24px floor.
		expect(span.getBoundingClientRect().width).toBe(44)

		expect(span.getBoundingClientRect().height).toBe(44)
	})

	it.each(rows(baseline))('%s has no two hit areas that overlap', (_name, { element }) => {
		const { container } = renderUI(element)

		expect(overlappingHitAreas(container)).toEqual([])
	})
})

describe('hit areas of packed controls at the coarse floor', () => {
	it.each(rows(packed))('%s has no two hit areas that overlap', (_name, { element }) => {
		const { container } = renderUI(element)

		// The case must lay out a cluster, else it checks nothing.
		expect(visibleHitAreas(container)).toBeGreaterThanOrEqual(2)

		expect(overlappingHitAreas(container)).toEqual([])
	})
})
