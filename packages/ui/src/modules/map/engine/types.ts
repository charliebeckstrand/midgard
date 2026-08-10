import type { GeoGeometryObjects, GeoProjection } from 'd3-geo'
import type { MapSeriesColor } from '../../../recipes/kata/map'

/** `[longitude, latitude]`: GeoJSON order, opposite of the idiomatic "lat / lng". */
export type LngLat = [number, number]

/**
 * A projected frame point: where a {@link LngLat} lands once the fitted
 * projection has drawn it. The engine's other coordinate — geography arrives in
 * lon/lat and every drawn thing is measured here.
 *
 * @internal
 */
export type MapPoint2D = {
	x: number
	y: number
}

/**
 * An area of several parts, nested polygon → ring → position, with each
 * polygon's outer ring first and its holes after. GeoJSON `MultiPolygon`
 * coordinates exactly, so a dissolved territory passes straight through.
 *
 * The module's third coordinate word, beside geographic {@link LngLat} and frame
 * {@link MapPoint2D}. Named here rather than spelled inline because the nesting
 * depth is the only thing that parts it from a single ring, and two public
 * surfaces hand it to each other — `useMapCoverage` returns one and
 * `MapGeofence` takes one — so a reader who counts the brackets wrong on either
 * side type-checks and draws nothing.
 */
export type MapPolygons = LngLat[][][]

/** A key of `T` naming the field the map reads from each datum. */
export type DataKey<T> = keyof T & string

/**
 * A swatch shape, mirroring the mark it stands for: `rect` for the two things
 * that draw an area — a region and a geofence — `line` for a route and a marker,
 * `dot` for a point.
 *
 * Module vocabulary rather than an overlay's own, because a region is not an
 * overlay and `rect` is its shape first. One definition, because the legend and
 * the tooltip each key a {@link Swatch} shape off it, and a new mark shape must
 * reach both or neither.
 *
 * @internal
 */
export type MapSwatchShape = 'rect' | 'line' | 'dot'

/**
 * The identity fields a shape carries before it is decoded: a TopoJSON geometry
 * object and a GeoJSON feature both hold an `id` and `properties`, which is what
 * lets one reader name a shape in either form.
 *
 * `MapFeature` satisfies it, so a rule written against this reads a decoded
 * atlas too.
 */
export type MapShape = {
	type?: string
	id?: string | number
	properties?: Record<string, unknown> | null
}

/**
 * A GeoJSON feature, structurally: enough shape for region identity and
 * drawing. Atlas data (`us-atlas`, `world-atlas`) and Photon results satisfy it
 * as-is.
 *
 * @remarks The geometry is `d3-geo`'s own union rather than an opaque `object`,
 * so a reader that walks it narrows on `type` where it used to cast. Holding it
 * opaque was meant to keep `@types/geojson` out of a consumer's graph, which it
 * never did: `@types/d3-geo` declares that package as its own dependency and
 * `packages/ui` depends on `@types/d3-geo` directly.
 */
export type MapFeature = {
	type: 'Feature'
	id?: string | number
	properties?: Record<string, unknown> | null
	geometry: GeoGeometryObjects | null
}

/** A GeoJSON feature collection of {@link MapFeature}s. */
export type MapFeatureCollection = {
	type: 'FeatureCollection'
	features: MapFeature[]
}

/**
 * A TopoJSON topology, structurally: the shape atlas packages ship. Which of
 * its `objects` draws is chosen by `geographyObject` (defaulting to the first
 * key).
 */
export type MapTopology = {
	type: 'Topology'
	objects: Record<string, object>
	arcs: unknown[]
}

/**
 * Prop-supplied map geometry: a TopoJSON topology or a ready GeoJSON feature
 * collection. The package ships no atlas data — pass `us-atlas`,
 * `world-atlas`, or any equivalent source.
 */
export type MapGeography = MapTopology | MapFeatureCollection

/**
 * One region category: the data value it matches, with optional legend text
 * and slot-colour override. Omitted entirely, categories derive from the data
 * in first-appearance order.
 */
export type MapCategory = {
	/** The value of `categoryKey` this category collects. */
	value: string
	/** Legend and tooltip text; defaults to `value`. */
	label?: string
	/**
	 * Named mark colour override. Defaults to the categorical slot palette in
	 * fixed order, so a category keeps its colour when siblings toggle.
	 */
	color?: MapSeriesColor
}

/**
 * A picked overlay mark, in the pair its reporters hand back: the mark's `id`,
 * and which of its stops — a `MapPoints` dot's index in the points the caller
 * passed. Omitting the index names the mark's first stop, which is the whole of
 * a singular mark; an index the mark has no stop for picks nothing, the same
 * silence an id naming no mark keeps.
 */
export type MapOverlaySelection = {
	id: string
	index?: number
}

/** A built-in projection name; the US composite places Alaska and Hawaii as insets. */
export type MapNamedProjection = 'mercator' | 'albers-usa' | 'equal-earth'

/**
 * How the map projects the globe onto the frame: a built-in name, or any
 * `d3-geo` projection instance as the escape hatch. Either way the projection
 * is refit to the drawn geography whenever the frame resizes.
 */
export type MapProjection = MapNamedProjection | GeoProjection

/**
 * The map frame's aspect ratio: `'auto'` takes the fitted geography's own
 * projected proportions, a `width / height` number or `"4/3"` string fixes
 * one, and `false` leaves the frame free-form to fill its container.
 */
export type MapAspectRatio = number | `${number}/${number}` | 'auto' | false

/**
 * Where the map's legend sits around the plot: a centered row above or below
 * it, or a column panel beside it — side by side from `lg`, under the map
 * below that.
 */
export type MapLegendPlacement = 'top' | 'bottom' | 'left' | 'right'
