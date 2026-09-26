import { beforeAll, describe, expect, it } from 'vitest'
import { page } from 'vitest/browser'
import { MapGeofence, MapPlat } from '../../modules/map'
import { allBySlot, getSlot, renderUI, waitFor } from '../helpers'
import { FIXTURE_GEOJSON } from '../helpers/map-geography'

/**
 * The legend under the map is a centered wrap row, as its TSDoc and its arrow keys say.
 *
 * The row was a grid with no column template, so each entry took its own line. On a phone the
 * legend was then as tall as its entry count. Placement is a computed-layout claim, so this
 * rides the real browser.
 */
describe('map legend row (real browser)', () => {
	beforeAll(() => page.viewport(390, 844))

	function zones(names: string[]) {
		return renderUI(
			<MapPlat aria-label="Zones" geography={FIXTURE_GEOJSON} width={358}>
				{names.map((name, index) => (
					<MapGeofence key={name} label={name} at={[8 + index * 3, 5]} radius={300_000} />
				))}
			</MapPlat>,
		)
	}

	it('puts short entries on one line', async () => {
		const { container } = zones(['North', 'South', 'East'])

		await waitFor(() => expect(allBySlot(container, 'map-legend-item')).toHaveLength(3))

		const tops = (allBySlot(container, 'map-legend-item') as HTMLElement[]).map(
			(entry) => entry.getBoundingClientRect().top,
		)

		for (const top of tops) expect(top).toBeCloseTo(tops[0] as number, 0)
	})

	it('keeps a long entry inside the row', async () => {
		const { container } = zones([
			'Dallas–Fort Worth metroplex catchment and surrounding counties',
			'Reno',
		])

		await waitFor(() => expect(allBySlot(container, 'map-legend-item')).toHaveLength(2))

		const row = getSlot(container, 'map-legend').getBoundingClientRect()

		for (const entry of allBySlot(container, 'map-legend-item') as HTMLElement[]) {
			const rect = entry.getBoundingClientRect()

			expect(rect.left).toBeGreaterThanOrEqual(row.left - 1)

			expect(rect.right).toBeLessThanOrEqual(row.right + 1)
		}
	})
})
