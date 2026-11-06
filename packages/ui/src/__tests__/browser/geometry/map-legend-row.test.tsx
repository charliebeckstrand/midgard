import { beforeAll, describe, expect, it } from 'vitest'
import { page } from 'vitest/browser'
import { MapPlat } from '../../../modules/map'
import { allBySlot, getSlot, renderUI } from '../../helpers'
import { HALF_PIXEL } from '../../helpers/geometry/tolerance'
import { FIXTURE_GEOJSON } from '../../helpers/map-geography'
import { renderZones } from '../helpers/map-zones'

/**
 * The legend under the map is a centered wrap row, as its TSDoc and its arrow keys say.
 *
 * The row was a grid with no column template, so each entry took its own line. On a phone the
 * legend was then as tall as its entry count. Placement is a computed-layout claim, so this
 * rides the real browser.
 */
describe('map legend row (real browser)', () => {
	beforeAll(() => page.viewport(390, 844))

	/** The zones `names` on a map 358px wide. */
	const zones = (names: string[]) => renderZones(names, { width: 358 })

	it('puts short entries on one line', async () => {
		const { container } = await zones(['North', 'South', 'East'])

		const tops = (allBySlot(container, 'map-legend-item') as HTMLElement[]).map(
			(entry) => entry.getBoundingClientRect().top,
		)

		for (const top of tops) expect(top).toBeNear(tops[0] as number, HALF_PIXEL)
	})

	it('keeps a long entry inside the row', async () => {
		const { container } = await zones([
			'Dallas–Fort Worth metroplex catchment and surrounding counties',
			'Reno',
		])

		const row = getSlot(container, 'map-legend').getBoundingClientRect()

		for (const entry of allBySlot(container, 'map-legend-item') as HTMLElement[]) {
			const rect = entry.getBoundingClientRect()

			expect(rect.left).toBeGreaterThanOrEqual(row.left - 1)

			expect(rect.right).toBeLessThanOrEqual(row.right + 1)
		}
	})

	it('reserves the height of one entry before the first entry registers', async () => {
		// The side placements stack under the map below its own `@lg` width, so at
		// 358px every placement lays its box under or over the plot as a row.
		for (const legend of ['bottom', 'top', 'right', 'left'] as const) {
			// A child that never registers stands in for overlays whose entries land
			// after hydration: the box that the server paints.
			const pending = renderUI(
				<MapPlat aria-label="Backdrop" geography={FIXTURE_GEOJSON} width={358} legend={legend}>
					<circle r={1} />
				</MapPlat>,
			)

			const reserved = getSlot(pending.container, 'map-legend-box').getBoundingClientRect().height

			pending.unmount()

			const { container } = await renderZones(['North'], { legend, width: 358 })

			const entry = getSlot(container, 'map-legend-item').getBoundingClientRect().height

			expect(entry).toBeGreaterThan(0)

			expect(reserved).toBeNear(entry, HALF_PIXEL)

			expect(getSlot(container, 'map-legend-box').getBoundingClientRect().height).toBeNear(
				reserved,
				HALF_PIXEL,
			)
		}
	})
})
