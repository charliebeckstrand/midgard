import { feature } from 'topojson-client'
import type { MapFeatureCollection } from 'ui/map'
import counties from 'us-atlas/counties-albers-10m.json'

type Topology = Parameters<typeof feature>[0]

/** The county object of the atlas, which this reads structurally. */
type Atlas = {
	objects: { counties: { type: 'GeometryCollection'; geometries: { id?: string }[] } }
}

const atlas = counties as unknown as Atlas

/**
 * The scale that rounds a coordinate: `100` keeps two decimals. The atlas is
 * projected onto a frame 975 units wide, and it is quantized to about a
 * hundredth of a unit. Two decimals therefore keep all of it, and they halve
 * the size of the shapes.
 */
const PLACES = 100

/** The shapes of each state that a reader opened, by FIPS code. Built once for each state. */
const byState = new Map<string, string>()

/** The ratio of the width to the height of the counties of each state, by FIPS code. */
const aspects = new Map<string, number>()

/** The x and y bounds of each position in a nest of coordinate arrays. */
function extend(bounds: number[], coordinates: unknown): void {
	if (!Array.isArray(coordinates)) return

	const [x, y] = coordinates

	if (typeof x === 'number' && typeof y === 'number') {
		bounds[0] = Math.min(bounds[0] ?? x, x)
		bounds[1] = Math.min(bounds[1] ?? y, y)
		bounds[2] = Math.max(bounds[2] ?? x, x)
		bounds[3] = Math.max(bounds[3] ?? y, y)

		return
	}

	for (const child of coordinates) extend(bounds, child)
}

/**
 * The counties of a state from `us-atlas`, as one feature collection in JSON.
 * The id of each county is its 5-digit FIPS code, and its name is in
 * `properties.name`. The shapes are already projected by the `albers-usa`
 * composite, so the map draws them under `'identity'` with no spherical math.
 *
 * @param stateFips - The 2-digit FIPS code of the state.
 */
export function countyShapes(stateFips: string): string {
	const cached = byState.get(stateFips)

	if (cached !== undefined) return cached

	const geometries = atlas.objects.counties.geometries.filter((county) =>
		county.id?.startsWith(stateFips),
	)

	const collection = feature(
		counties as unknown as Topology,
		{
			type: 'GeometryCollection',
			geometries,
		} as unknown as Parameters<typeof feature>[1],
	) as unknown as MapFeatureCollection

	const json = JSON.stringify(collection, (_key, value) =>
		typeof value === 'number' ? Math.round(value * PLACES) / PLACES : value,
	)

	byState.set(stateFips, json)

	return json
}

/**
 * The ratio of the width to the height of the counties of a state, as the
 * atlas projects them. A county map of the state takes it as its frame, so the
 * frame has its final size in the first paint, before the shapes load.
 *
 * @param stateFips - The 2-digit FIPS code of the state.
 */
export function countyAspect(stateFips: string): number {
	const cached = aspects.get(stateFips)

	if (cached !== undefined) return cached

	const collection = JSON.parse(countyShapes(stateFips)) as {
		features: { geometry: { coordinates: unknown } | null }[]
	}

	const bounds: number[] = []

	for (const shape of collection.features) extend(bounds, shape.geometry?.coordinates)

	const [x0 = 0, y0 = 0, x1 = 1, y1 = 1] = bounds

	const aspect = y1 > y0 ? (x1 - x0) / (y1 - y0) : 1

	aspects.set(stateFips, aspect)

	return aspect
}
