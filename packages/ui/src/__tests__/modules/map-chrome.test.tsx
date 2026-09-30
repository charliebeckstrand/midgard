import { describe, expect, it } from 'vitest'
import { MapPlat } from '../../modules/map'
import { CHROME_STROKE_WIDTH } from '../../modules/map/engine/map-constants'
import { allRegions, bySlot, renderUI } from '../helpers'
import { subpathCount } from '../helpers/geometry/svg-path'
import { FIXTURE_GEOJSON } from '../helpers/map-geography'

/** A data-less plat over the fixture squares; the chrome props are the whole variable. */
function plat(extra?: { graticule?: boolean | number; sphere?: boolean; zoom?: boolean }) {
	return <MapPlat aria-label="Atlas" geography={FIXTURE_GEOJSON} width={400} {...extra} />
}

describe('MapPlat chrome', () => {
	it('draws no chrome by default', () => {
		const { container } = renderUI(plat())

		expect(bySlot(container, 'map-chrome')).toBeNull()

		expect(allRegions(container)).toHaveLength(3)
	})

	it('rules the graticule under the geography, off the pointer', () => {
		const { container } = renderUI(plat({ graticule: true }))

		const chrome = bySlot(container, 'map-chrome')

		const graticule = bySlot(container, 'map-graticule')

		expect(chrome).toHaveClass('pointer-events-none')

		expect(graticule?.getAttribute('d')).toMatch(/^M/)

		expect(graticule).toHaveAttribute('fill', 'none')

		// The hairline is stated in device pixels and converted to frame units by the
		// chrome itself — two paths, so it reads the scale rather than inheriting it
		// the way the atlas below it does.
		expect(graticule).toHaveAttribute('stroke-width', String(CHROME_STROKE_WIDTH))

		expect(graticule).not.toHaveAttribute('vector-effect')

		// Paint order is document order: the chrome group precedes the region layer,
		// so a region fill covers the hairlines that cross it.
		const regions = bySlot(container, 'map-regions')

		expect(chrome?.compareDocumentPosition(regions as Node)).toBe(Node.DOCUMENT_POSITION_FOLLOWING)
	})

	it('honors a degree step', () => {
		const { container: fine } = renderUI(plat({ graticule: 10 }))

		const { container: coarse } = renderUI(plat({ graticule: 30 }))

		const step = (container: HTMLElement) =>
			subpathCount(bySlot(container, 'map-graticule')?.getAttribute('d'))

		expect(step(coarse)).toBeLessThan(step(fine))
	})

	it('outlines the sphere on its own, in its own ink', () => {
		const { container } = renderUI(plat({ sphere: true }))

		expect(bySlot(container, 'map-graticule')).toBeNull()

		const sphere = bySlot(container, 'map-sphere')

		expect(sphere?.getAttribute('d')).toMatch(/^M/)

		// The graticule takes the chart gridline and the sphere the axis baseline, a
		// step firmer; they must never resolve to one ink.
		const { container: ruled } = renderUI(plat({ graticule: true }))

		expect(sphere?.getAttribute('class')).not.toBe(
			bySlot(ruled, 'map-graticule')?.getAttribute('class'),
		)
	})

	it('draws both parts together, off one frame path', () => {
		const { container } = renderUI(plat({ graticule: true, sphere: true }))

		expect(bySlot(container, 'map-graticule')).toBeInTheDocument()

		// One path resolves the bound and the outline, so the two can never
		// disagree about where the projection draws.
		expect(bySlot(container, 'map-sphere')?.getAttribute('d')).toBe(
			bySlot(container, 'map-chrome-clip')?.firstElementChild?.getAttribute('d'),
		)
	})

	it('rides the view transform, so a zoom carries the lines with the geography', () => {
		// A meridian is a position on the globe like every region: it draws in frame
		// units, so it must travel and scale under the zoom group rather than hang
		// over a map moving beneath it.
		const { container } = renderUI(plat({ graticule: true, sphere: true, zoom: true }))

		expect(bySlot(container, 'map-chrome')?.closest('[data-slot="map-zoom"]')).toBeInTheDocument()

		// Still above the marks, so a region fill covers the lines that cross it.
		const chrome = bySlot(container, 'map-chrome')

		expect(chrome?.compareDocumentPosition(bySlot(container, 'map-regions') as Node)).toBe(
			Node.DOCUMENT_POSITION_FOLLOWING,
		)
	})

	it('bounds the graticule by the frame the projection draws', () => {
		const { container } = renderUI(plat({ graticule: true }))

		const clip = bySlot(container, 'map-chrome-clip')

		const id = clip?.getAttribute('id') ?? ''

		expect(id).not.toBe('')

		// The even-odd rule is what reads a composite's inset boxes as holes rather
		// than as frame, so the insets stay clear of the fragments each
		// sub-projection would otherwise fill them with.
		expect(clip?.querySelector('path')).toHaveAttribute('clip-rule', 'evenodd')

		expect(bySlot(container, 'map-graticule')).toHaveAttribute('clip-path', `url(#${id})`)
	})
})
