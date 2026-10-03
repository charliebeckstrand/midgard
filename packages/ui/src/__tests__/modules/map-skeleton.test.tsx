import { describe, expect, it } from 'vitest'
import { MapSkeleton } from '../../modules/map'
import { ALBERS_USA_ASPECT } from '../../modules/map/engine/map-constants'
import { MAP_OUTLINE_DATA } from '../../modules/map/engine/map-outline-data'
import { bySlot, renderUI } from '../helpers'

describe('MapSkeleton', () => {
	it('reserves the map frame at the plat fallback ratio, on one element', () => {
		const { container } = renderUI(<MapSkeleton />)

		const box = bySlot(container, 'placeholder')

		expect(box?.getAttribute('style')).toContain(`aspect-ratio: ${16 / 9}`)

		// The placeholder is the frame: no wrapper adds a second slot.
		expect(container.querySelectorAll('[data-slot]')).toHaveLength(1)
	})

	it('reserves what the projection reserves, so the plat swaps in without a jump', () => {
		// An atlas-less plat on the default `aspectRatio: 'auto'` reserves
		// `projectionFallbackAspect`, so a skeleton in front of it must read the
		// same figure — the generic 16/9 is ~18px taller at 800px wide, in exactly
		// the swap this component exists to prevent.
		const composite = renderUI(<MapSkeleton projection="albers-usa" />)

		expect(bySlot(composite.container, 'placeholder')?.getAttribute('style')).toContain(
			`aspect-ratio: ${ALBERS_USA_ASPECT}`,
		)

		// A world projection frames arbitrary geography and knows no ratio, so it
		// falls through to the generic reserve.
		const world = renderUI(<MapSkeleton projection="mercator" />)

		expect(bySlot(world.container, 'placeholder')?.getAttribute('style')).toContain(
			`aspect-ratio: ${16 / 9}`,
		)

		// An explicit ratio is the narrower statement and wins over both.
		const fixed = renderUI(<MapSkeleton projection="albers-usa" aspectRatio="4/3" />)

		expect(bySlot(fixed.container, 'placeholder')?.getAttribute('style')).toContain(
			`aspect-ratio: ${4 / 3}`,
		)
	})

	it('takes an explicit ratio, and fills the container under ratio={false}', () => {
		const fixed = renderUI(<MapSkeleton aspectRatio="4/3" />)

		expect(bySlot(fixed.container, 'placeholder')?.getAttribute('style')).toContain(
			`aspect-ratio: ${4 / 3}`,
		)

		const fill = renderUI(<MapSkeleton aspectRatio={false} />)

		expect(bySlot(fill.container, 'placeholder')?.getAttribute('style')).toBeNull()
	})

	it('draws the outline of a fixed-subject projection in place of the rectangle', () => {
		// `albers-usa` is the United States, so its outline is on by default.
		const composite = renderUI(<MapSkeleton projection="albers-usa" />)

		const outline = composite.container.querySelector('svg[data-slot=placeholder]')

		expect(outline?.getAttribute('viewBox')).toBe(
			`0 0 ${MAP_OUTLINE_DATA['albers-usa'].width} ${MAP_OUTLINE_DATA['albers-usa'].height}`,
		)

		expect(outline?.getAttribute('aria-hidden')).toBe('true')

		expect(composite.container.querySelector('div[data-slot=placeholder]')).toBeNull()

		// The outline itself reserves the frame.
		expect(outline?.getAttribute('style')).toContain(`aspect-ratio: ${ALBERS_USA_ASPECT}`)

		const off = renderUI(<MapSkeleton projection="albers-usa" outline={false} />)

		expect(off.container.querySelector('svg[data-slot=placeholder]')).toBeNull()

		expect(bySlot(off.container, 'placeholder')).toBeInTheDocument()
	})

	it('draws the world outline only when asked, since a world projection frames any geography', () => {
		const plain = renderUI(<MapSkeleton projection="mercator" />)

		expect(plain.container.querySelector('svg[data-slot=placeholder]')).toBeNull()

		const world = renderUI(<MapSkeleton projection="mercator" outline aspectRatio={false} />)

		const outline = world.container.querySelector('svg[data-slot=placeholder]')

		expect(outline?.querySelector('path')?.getAttribute('d')).toBe(MAP_OUTLINE_DATA.mercator.d)

		// A fill skeleton reserves no ratio; the outline takes the container itself.
		expect(outline?.getAttribute('style')).toBeNull()

		// No projection has no outline to draw.
		const none = renderUI(<MapSkeleton outline />)

		expect(none.container.querySelector('svg[data-slot=placeholder]')).toBeNull()
	})
})
