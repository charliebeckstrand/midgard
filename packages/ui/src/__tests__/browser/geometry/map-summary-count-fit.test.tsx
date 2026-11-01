import { describe, expect, it } from 'vitest'
import { MapPlat, MapPoints } from '../../../modules/map'
import type { LngLat } from '../../../modules/map/engine/types'
import { LocaleProvider } from '../../../providers/locale'
import { getSlot, renderUI } from '../../helpers'
import { FIXTURE_GEOJSON } from '../../helpers/map-geography'

/** `count` stops packed close enough together that the frame draws them as one summary. */
const packed = (count: number) =>
	Array.from({ length: count }, (_, index) => ({
		at: [8 + (index % 40) * 0.001, 5 + Math.floor(index / 40) * 0.001] as LngLat,
	}))

/**
 * The count inside a summary dot, in a real browser: only a layout engine sets
 * the glyphs, so only here can a test read how wide the label paints.
 *
 * The dot is a stroke, so its radius is half the stroke width, in frame units
 * that the screen matrix converts to pixels. The label centers on the dot, and
 * both its ends must sit inside the rim. An end past the rim is a digit painted
 * on the geography, in the label ink, which is the color of the surface beside
 * it.
 *
 * The pointer target covers the whole dot too, since the widest labels grow the
 * dot past the finger target.
 *
 * Both locales, because the label is the formatted count, and the two locales
 * format the same count to different widths: `1,200` against `1200`, and
 * `12,000` against `12.000`.
 */
describe('summary dot count', () => {
	it.each([
		['en-US', 1_200, '1,200'],
		['en-US', 12_000, '12,000'],
		['es-ES', 1_200, '1200'],
		['es-ES', 12_000, '12.000'],
	])('holds the %s label of %i stops inside the dot', (locale, count, label) => {
		const { container } = renderUI(
			<LocaleProvider locale={locale}>
				<MapPlat aria-label="Test map" geography={FIXTURE_GEOJSON} width={400}>
					<MapPoints label="Stops" points={packed(count)} />
				</MapPlat>
			</LocaleProvider>,
		)

		const text = getSlot(container, 'map-points-count')

		expect(text.textContent).toBe(label)

		const dot = getSlot(container, 'map-points-cluster') as unknown as SVGGraphicsElement

		const scale = dot.getScreenCTM()?.a ?? 1

		const radius = (Number(dot.getAttribute('stroke-width')) / 2) * scale

		// The label centers on the dot, so it stays inside while half its width does.
		const half = ((text as unknown as SVGTextElement).getBBox().width / 2) * scale

		expect(half).toBeGreaterThan(0)

		expect(half).toBeLessThan(radius)

		// A summary that grows past the finger target takes a target as wide as
		// itself, so no ring of the drawn dot is dead to the pointer.
		const hit = getSlot(container, 'map-points-hit')

		expect(Number(hit.getAttribute('r')) * scale).toBeGreaterThanOrEqual(radius)
	})
})
