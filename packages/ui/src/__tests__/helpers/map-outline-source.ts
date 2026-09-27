import { geoStream } from 'd3-geo'
import { feature, merge } from 'topojson-client'
import nationTopology from 'us-atlas/nation-10m.json'
import statesTopology from 'us-atlas/states-10m.json'
import countriesTopology from 'world-atlas/countries-110m.json'
import type { MapFeature, MapNamedProjection } from '../../modules/map'
import type { MapOutline } from '../../modules/map/engine/map-outline'
import { canonicalFit } from '../../modules/map/engine/map-projection/fit'

/**
 * The width of the outline frame. The skeleton scales the outline to its box,
 * so this sets only the precision of the coordinates. At 500 every coordinate
 * is an integer of three digits or less.
 */
const OUTLINE_WIDTH = 500

/** The Douglas-Peucker tolerance, in outline units. */
const TOLERANCE = 1

/** A ring with less area than this, in square outline units, is not drawn. */
const MIN_AREA = 8

type Point = [number, number]

/**
 * The atlases the map's own demos and the places app draw. The world atlas
 * loses Antarctica, as it does in every world view the places app draws: under
 * Mercator it stretches into a band across the foot of the frame.
 */
type Topology = Parameters<typeof merge>[0]

type GeometryCollection = Extract<Parameters<typeof feature>[1], { type: 'GeometryCollection' }>

type Atlas<Name extends string> = Topology & { objects: Record<Name, GeometryCollection> }

const countries = countriesTopology as unknown as Atlas<'countries'>

const states = statesTopology as unknown as Atlas<'states'>

const nation = nationTopology as unknown as Atlas<'nation'>

const worldGeometries = countries.objects.countries.geometries.filter(
	(geometry) => (geometry.properties as { name?: string } | undefined)?.name !== 'Antarctica',
)

function worldFeatures(): MapFeature[] {
	const collection = feature(countries, {
		type: 'GeometryCollection',
		geometries: worldGeometries,
	})

	return collection.features as unknown as MapFeature[]
}

function usFeatures(): MapFeature[] {
	return feature(states, states.objects.states).features as unknown as MapFeature[]
}

/** Keeps the points of `points` that hold its shape within `tolerance`. */
function simplify(points: Point[], tolerance: number): Point[] {
	if (points.length < 3) return points

	const keep = new Uint8Array(points.length)

	keep[0] = 1

	keep[points.length - 1] = 1

	const stack: [number, number][] = [[0, points.length - 1]]

	for (let span = stack.pop(); span !== undefined; span = stack.pop()) {
		const [a, b] = span

		const [ax, ay] = points[a] as Point

		const [bx, by] = points[b] as Point

		const dx = bx - ax

		const dy = by - ay

		const length = Math.hypot(dx, dy)

		let farthest = -1

		let distance = tolerance

		for (let i = a + 1; i < b; i++) {
			const [x, y] = points[i] as Point

			const d =
				length === 0 ? Math.hypot(x - ax, y - ay) : Math.abs(dy * (x - ax) - dx * (y - ay)) / length

			if (d > distance) {
				distance = d

				farthest = i
			}
		}

		if (farthest !== -1) {
			keep[farthest] = 1

			stack.push([a, farthest], [farthest, b])
		}
	}

	return points.filter((_, i) => keep[i] === 1)
}

function area(ring: Point[]): number {
	let sum = 0

	for (let i = 0; i < ring.length; i++) {
		const [x0, y0] = ring[i] as Point

		const [x1, y1] = ring[(i + 1) % ring.length] as Point

		sum += x0 * y1 - x1 * y0
	}

	return Math.abs(sum) / 2
}

/** One ring as relative path commands: an absolute move, then `l` steps. */
function ringPath(ring: Point[]): string {
	const [first, ...rest] = ring as [Point, ...Point[]]

	let previous = first

	let steps = ''

	for (const point of rest) {
		for (const delta of [point[0] - previous[0], point[1] - previous[1]]) {
			steps += `${steps === '' || delta < 0 ? '' : ' '}${delta}`
		}

		previous = point
	}

	return `M${first[0]} ${first[1]}l${steps}z`
}

/**
 * Builds the outline of `features` under the named projection's canonical fit:
 * the frame the plat draws them in before it measures its box. The outline
 * frame is that frame at {@link OUTLINE_WIDTH}, so an outline scaled to meet a
 * box lands where the plat draws the geography in the same box.
 */
function buildOutline(spec: MapNamedProjection, features: MapFeature[], shape: object): MapOutline {
	const fit = canonicalFit(spec, features)

	if (fit === null) throw new Error(`No canonical fit for ${spec}`)

	const factor = OUTLINE_WIDTH / fit.width

	const [tx, ty] = fit.projection.translate()

	const projection = fit.projection
		.scale(fit.projection.scale() * factor)
		.translate([tx * factor, ty * factor])

	const rings: Point[][] = []

	let ring: Point[] = []

	geoStream(
		shape as Parameters<typeof geoStream>[0],
		projection.stream({
			point: (x, y) => {
				ring.push([x, y])
			},
			lineStart: () => {
				ring = []
			},
			lineEnd: () => {
				rings.push(ring)
			},
			polygonStart: () => {},
			polygonEnd: () => {},
			sphere: () => {},
		}),
	)

	const d = rings
		.map((points) => {
			const rounded = simplify(points, TOLERANCE).map(
				([x, y]): Point => [Math.round(x), Math.round(y)],
			)

			return rounded.filter(
				(point, i) =>
					i === 0 || point[0] !== rounded[i - 1]?.[0] || point[1] !== rounded[i - 1]?.[1],
			)
		})
		.filter((points) => points.length >= 3 && area(points) >= MIN_AREA)
		.map(ringPath)
		.join('')

	return { width: OUTLINE_WIDTH, height: Math.round(fit.height * factor), d }
}

/**
 * The outline of each named projection's subject, as `map-outline-data.ts`
 * holds it. The test that compares the two runs this, and so does the write
 * that brings the data file up to date.
 */
export function buildMapOutlines(): Record<MapNamedProjection, MapOutline> {
	// Every country in the atlas is a polygon or a multipolygon.
	const land = merge(countries, worldGeometries as Parameters<typeof merge>[1])

	const world = worldFeatures()

	return {
		'albers-usa': buildOutline('albers-usa', usFeatures(), feature(nation, nation.objects.nation)),
		mercator: buildOutline('mercator', world, land),
		'equal-earth': buildOutline('equal-earth', world, land),
	}
}
