import type { GeoProjection } from 'd3-geo'
import type { MapSeriesColor } from '../../recipes/kata/map'

/** `[longitude, latitude]`: GeoJSON order, opposite of the idiomatic "lat / lng". */
export type LngLat = [number, number]

/** A key of `T` naming the field the map reads from each datum. */
export type DataKey<T> = keyof T & string

/**
 * A GeoJSON feature, structurally: enough shape for region identity and
 * drawing without pulling `@types/geojson` into consumer graphs. Atlas data
 * (`us-atlas`, `world-atlas`) and Photon results satisfy it as-is.
 */
export type MapFeature = {
	type: 'Feature'
	id?: string | number
	properties?: Record<string, unknown> | null
	geometry: object | null
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
