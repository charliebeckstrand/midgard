import { describe, expect, it } from 'vitest'
import { MapSkeleton } from '../../modules/map'
import { ALBERS_USA_ASPECT } from '../../modules/map/engine/map-constants'
import { bySlot, renderUI } from '../helpers'

describe('MapSkeleton', () => {
	it('reserves the map frame in an aspect box at the plat fallback ratio', () => {
		const { container } = renderUI(<MapSkeleton />)

		const box = bySlot(container, 'aspect-ratio')

		expect(box).toBeInTheDocument()

		expect(box?.getAttribute('style')).toContain(`aspect-ratio: ${16 / 9}`)

		expect(bySlot(container, 'placeholder')).toBeInTheDocument()
	})

	it('reserves what the projection reserves, so the plat swaps in without a jump', () => {
		// An atlas-less plat on the default `aspectRatio: 'auto'` reserves
		// `projectionFallbackAspect`, so a skeleton in front of it must read the
		// same figure — the generic 16/9 is ~18px taller at 800px wide, in exactly
		// the swap this component exists to prevent.
		const composite = renderUI(<MapSkeleton projection="albers-usa" />)

		expect(bySlot(composite.container, 'aspect-ratio')?.getAttribute('style')).toContain(
			`aspect-ratio: ${ALBERS_USA_ASPECT}`,
		)

		// A world projection frames arbitrary geography and knows no ratio, so it
		// falls through to the generic reserve.
		const world = renderUI(<MapSkeleton projection="mercator" />)

		expect(bySlot(world.container, 'aspect-ratio')?.getAttribute('style')).toContain(
			`aspect-ratio: ${16 / 9}`,
		)

		// An explicit ratio is the narrower statement and wins over both.
		const fixed = renderUI(<MapSkeleton projection="albers-usa" ratio="4/3" />)

		expect(bySlot(fixed.container, 'aspect-ratio')?.getAttribute('style')).toContain(
			`aspect-ratio: ${4 / 3}`,
		)
	})

	it('takes an explicit ratio, and fills the container under ratio={false}', () => {
		const fixed = renderUI(<MapSkeleton ratio="4/3" />)

		expect(bySlot(fixed.container, 'aspect-ratio')?.getAttribute('style')).toContain(
			`aspect-ratio: ${4 / 3}`,
		)

		const fill = renderUI(<MapSkeleton ratio={false} />)

		expect(bySlot(fill.container, 'aspect-ratio')).toBeNull()

		expect(bySlot(fill.container, 'placeholder')).toBeInTheDocument()
	})
})
