/**
 * Deterministic fixtures for the map benches: the `us-atlas` geographies,
 * prepared once, plus LCG-seeded region datasets. Identical parameters give
 * identical output, so the variance from run to run comes from the module
 * under test, not from the data.
 */

import countiesRaw from 'us-atlas/counties-10m.json'
import statesRaw from 'us-atlas/states-10m.json'
import { geographyFeatures } from '../../modules/map/engine/map-geometry/topology'
import type {
	LngLat,
	MapFeatureCollection,
	MapPolygons,
	MapTopology,
} from '../../modules/map/engine/types'
import { rng } from '../fixtures'

/** One prepared atlas: the topology and its decoded features. */
export type MapAtlas = {
	/** The TopoJSON that the ui module reads. */
	topology: MapTopology
	/** The decoded GeoJSON. The pure-core benches and {@link COVERAGE_AREA} read it. */
	geoJson: MapFeatureCollection
	/** The FIPS ids in feature order: the join key of each dataset. */
	ids: string[]
}

/**
 * Whether a FIPS id lies in the conterminous US: the states plus DC (state
 * prefix ≤ 56), minus Alaska (02) and Hawaii (15). The suite draws only these.
 * The territories fall outside the `albers-usa` composite of the ui module.
 * The same scope keeps the numbers comparable with the earlier entries of the
 * README log.
 */
function conterminous(id: unknown): boolean {
	const prefix = Number(String(id).slice(0, 2))

	return prefix <= 56 && prefix !== 2 && prefix !== 15
}

/**
 * Prepares one `us-atlas` topology: filters it to the conterminous US and
 * decodes its GeoJSON view. The ui module joins the rows on `feature.id`.
 */
function prepareAtlas(raw: unknown, object: string): MapAtlas {
	const topology = raw as MapTopology

	const collection = topology.objects[object] as { geometries: { id?: string | number }[] }

	collection.geometries = collection.geometries.filter((geometry) => conterminous(geometry.id))

	const features = geographyFeatures(topology, object)

	return {
		topology,
		geoJson: { type: 'FeatureCollection', features },
		ids: features.map((feature) => String(feature.id)),
	}
}

/** The conterminous US states plus DC: 49 regions. */
export const statesAtlas = prepareAtlas(statesRaw, 'states')

/** Every conterminous-US county: 3,108 regions. */
export const countiesAtlas = prepareAtlas(countiesRaw, 'counties')

/** The categorical zones, in the explicit order that the legend shows. */
export const ZONES = ['Pacific', 'Mountain', 'Central', 'Eastern'] as const

/** The five-stop sequential ramp that the numeric color scale samples. */
export const VALUE_RAMP = ['#eff6ff', '#bfdbfe', '#60a5fa', '#2563eb', '#1e3a8a']

/** The numeric values' fixed domain ceiling. */
export const VALUE_MAX = 10_000

/** One categorical row for the ui module's `regionKey` / `categoryKey` join. */
type ZoneRow = { fips: string; zone: string }

/** One numeric row for the `regionKey` / `valueKey` join of the ui choropleth. */
type JoinRow = { fips: string; value: number }

/** One categorical dataset. */
export type ZoneData = {
	rows: ZoneRow[]
}

/** Assigns every region a zone, LCG-seeded; two seeds give the update flip. */
export function makeZones(atlas: MapAtlas, seed = 1): ZoneData {
	const next = rng(seed)

	const indexes = atlas.ids.map(() => Math.floor(next() * ZONES.length))

	return {
		rows: atlas.ids.map((fips, i) => ({ fips, zone: ZONES[indexes[i] ?? 0] as string })),
	}
}

/** One numeric dataset. */
export type ValueData = {
	rows: JoinRow[]
}

/** Assigns every region a value in `[0, VALUE_MAX]`, LCG-seeded. */
export function makeValues(atlas: MapAtlas, seed = 1): ValueData {
	const next = rng(seed)

	const values = atlas.ids.map(() => Math.round(next() * VALUE_MAX))

	return {
		rows: atlas.ids.map((fips, i) => ({ fips, value: values[i] ?? 0 })),
	}
}

/**
 * Dots on a lattice across the lower forty-eight, so every one projects. Shared
 * by the overlay mount bench and the overlay hover bench, which must draw the
 * same set or their numbers cannot be read against each other.
 */
export const LATTICE_DOTS = Array.from({ length: 200 }, (_, index) => ({
	at: [-120 + (index % 20) * 3, 30 + Math.floor(index / 20) * 1.8] as [number, number],
	label: `Stop ${index + 1}`,
	detail: `${index} pallets`,
}))

/**
 * One coverage territory over the whole lower forty-eight: every conterminous
 * state's rings under one `MapGeofence`. It stands in for what `useMapCoverage`
 * dissolves out of a national ZIP-code selection, and runs a little heavier than
 * the real thing — a dissolve drops the interior seams these keep — which is the
 * direction a fixture should err.
 *
 * Its size is the whole point. 140 rings and ~9,900 vertices, under
 * {@link LATTICE_DOTS}, every one of whose two hundred dots stands on it: a zone
 * measured per dot rather than once walks all of that two hundred times over, on
 * every beat that rebuilds the targets. A circular zone is far too small to show
 * that — its 64 segments make the same mistake cost a twentieth of a millisecond
 * — so the bench that guards the rule has to draw a territory.
 */
export const COVERAGE_AREA: MapPolygons = statesAtlas.geoJson.features.flatMap((shape) => {
	const geometry = shape.geometry

	if (geometry?.type === 'Polygon') return [geometry.coordinates as LngLat[][]]

	if (geometry?.type === 'MultiPolygon') return geometry.coordinates as LngLat[][][]

	return []
})
