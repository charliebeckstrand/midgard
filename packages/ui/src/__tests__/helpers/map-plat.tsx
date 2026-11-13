import type { ReactNode } from 'react'
import { MapPlat, type MapPlatProps } from '../../modules/map'
import { FIXTURE_GEOJSON, FIXTURE_ROWS } from './map-geography'

/**
 * The plats the map suites draw, over the fixture geography.
 *
 * Not re-exported from `helpers/index.ts`: it imports the map module, which
 * only the map suites load.
 */

/** A row of {@link FIXTURE_ROWS}. */
type Row = (typeof FIXTURE_ROWS)[number]

/** The props of a plat over {@link FIXTURE_ROWS}. */
type RowPlatProps = Parameters<typeof MapPlat<Row>>[0]

/**
 * The fixture geography as a categorical map: the `zone` of each fixture row
 * colors the region that its `state` names, in a frame 400px wide.
 *
 * @remarks
 * `extra` replaces any single prop, the width and the geography included. An
 * override can name a value key beside the category key, which the prop union
 * forbids, so the cast at the spread keeps that override possible.
 *
 * @param extra - Props that replace the base ones.
 * @returns The plat element, for `renderUI` or `renderNavigable`.
 */
export function categoricalPlat(extra?: Partial<RowPlatProps>) {
	const props = {
		'aria-label': 'Zones',
		geography: FIXTURE_GEOJSON,
		data: FIXTURE_ROWS,
		regionKey: 'state',
		categoryKey: 'zone',
		width: 400,
		...extra,
	} as RowPlatProps

	return <MapPlat {...props} />
}

/**
 * The fixture geography with no data, in a frame 400px wide, and `children`
 * drawn over it.
 *
 * @param children - The overlays: points, routes, markers, and geofences.
 * @param props - The overlay the plat holds selected, where a case sets one.
 * @returns The plat element, for `renderUI` or `renderNavigable`.
 */
export function overlayPlat(children: ReactNode, props?: Pick<MapPlatProps, 'selectedOverlay'>) {
	return (
		<MapPlat aria-label="Test map" geography={FIXTURE_GEOJSON} width={400} {...props}>
			{children}
		</MapPlat>
	)
}
