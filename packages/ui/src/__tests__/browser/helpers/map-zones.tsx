import { expect, vi } from 'vitest'
import { MapGeofence, MapPlat, type MapPlatNoDataProps } from '../../../modules/map'
import { allBySlot, renderUI, waitFor } from '../../helpers'
import { FIXTURE_GEOJSON } from '../../helpers/map-geography'

/** The options of {@link renderZones}. */
type ZoneOptions = Pick<MapPlatNoDataProps, 'legend' | 'width'> & {
	/** A frame around the map, with its own direction and width. With no frame, the map renders directly in the container. */
	frame?: { dir?: 'ltr' | 'rtl'; width: number }
}

/**
 * Renders a map of geofence zones over the fixture geography, and waits until
 * its legend shows an entry for each zone.
 *
 * Each zone is a circle with a radius of 300 km. The centers go along the line
 * of latitude 5, 3 degrees apart, from longitude 8.
 *
 * @param names - The labels of the zones, in order.
 * @param options - The legend and width of the map, and the frame around it.
 * @returns The render result.
 *
 * @example
 * ```typescript
 * const { container } = await renderZones(['North', 'South'], { legend: 'right' })
 * ```
 */
export const renderZones = vi.defineHelper(
	async (names: string[], { frame, ...plot }: ZoneOptions = {}) => {
		const map = (
			<MapPlat aria-label="Zones" geography={FIXTURE_GEOJSON} {...plot}>
				{names.map((name, index) => (
					<MapGeofence key={name} label={name} at={[8 + index * 3, 5]} radius={300_000} />
				))}
			</MapPlat>
		)

		const view = renderUI(
			frame ? (
				<div dir={frame.dir} style={{ width: frame.width }}>
					{map}
				</div>
			) : (
				map
			),
		)

		await waitFor(() =>
			expect(allBySlot(view.container, 'map-legend-item')).toHaveLength(names.length),
		)

		return view
	},
)
