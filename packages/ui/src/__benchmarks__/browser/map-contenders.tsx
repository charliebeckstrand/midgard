/**
 * The mount/update/destroy adapters of the ui map, with the contract of the
 * chart adapters: `MapPlat` renders through React (`createRoot` +
 * `flushSync`). Each map draws the prepared `us-atlas` geometry (see
 * `map-fixtures.ts`) into the same fixed 800×450 box, with the animations off
 * and the `albers-usa` projection. The rows join to the regions by FIPS id.
 */

import type { MapCategory } from '../../modules/map/engine/types'
import { MapPlat } from '../../modules/map/map-plat'
import { type Contender, HEIGHT, reactContender, WIDTH } from './contenders'
import {
	type MapAtlas,
	VALUE_MAX,
	VALUE_RAMP,
	type ValueData,
	ZONES,
	type ZoneData,
} from './map-fixtures'

/**
 * The explicit category order. An update then recolors the regions, and does
 * not also derive the legend from the new rows again, or change its order.
 */
const UI_CATEGORIES: MapCategory[] = ZONES.map((zone) => ({ value: zone }))

/** The categorical zone map over one prepared atlas. */
export function zoneMapContenders(atlas: MapAtlas): Contender<ZoneData>[] {
	return [
		reactContender('ui MapPlat', (data) => (
			<MapPlat
				aria-label="Bench map"
				geography={atlas.topology}
				projection="albers-usa"
				data={data.rows}
				regionKey="fips"
				categoryKey="zone"
				categories={UI_CATEGORIES}
				width={WIDTH}
				height={HEIGHT}
			/>
		)),
	]
}

/** The numeric choropleth map over one prepared atlas. */
export function choroplethMapContenders(atlas: MapAtlas): Contender<ValueData>[] {
	return [
		reactContender('ui MapPlat', (data) => (
			<MapPlat
				aria-label="Bench map"
				geography={atlas.topology}
				projection="albers-usa"
				data={data.rows}
				regionKey="fips"
				valueKey="value"
				colorRange={VALUE_RAMP}
				colorDomain={[0, VALUE_MAX]}
				width={WIDTH}
				height={HEIGHT}
			/>
		)),
	]
}
