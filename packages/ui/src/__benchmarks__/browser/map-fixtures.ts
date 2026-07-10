/**
 * Deterministic fixtures for the competitive map benches: the `us-atlas`
 * geographies prepared once so every contender draws the same geometry, plus
 * LCG-seeded region datasets in each library's natural join shape. Identical
 * parameters produce identical output, so run-to-run variance reflects the
 * library under test, not the data.
 */

import countiesRaw from 'us-atlas/counties-10m.json'
import statesRaw from 'us-atlas/states-10m.json'
import { geographyFeatures } from '../../modules/map/map-geometry'
import type { MapFeatureCollection, MapTopology } from '../../modules/map/types'
import { rng } from './fixtures'

/** One prepared atlas: the same geometry in every contender's natural form. */
export type MapAtlas = {
	/** ECharts' `registerMap` key; unique per atlas. */
	name: string
	/** The TopoJSON the ui module and Highcharts consume directly. */
	topology: MapTopology
	/** The decoded GeoJSON ECharts registers; its features carry the injected `fips`. */
	geoJson: MapFeatureCollection
	/** FIPS ids in feature order — the join key every contender's rows share. */
	ids: string[]
}

/**
 * Whether a FIPS id lies in the conterminous US: the states plus DC (state
 * prefix ≤ 56), minus Alaska (02) and Hawaii (15). The suite draws only these:
 * the territories fall outside the ui module's `albers-usa` composite, and the
 * rivals ship no free US composite at all — their US idiom is a Lambert
 * conformal conic, which Alaska's antimeridian crossing would smear across the
 * projected plane, shrinking their fitted map to a fraction of the frame.
 * Scoping every contender to the lower 48 keeps the drawn regions identical
 * and every map filling the same box.
 */
function conterminous(id: unknown): boolean {
	const prefix = Number(String(id).slice(0, 2))

	return prefix <= 56 && prefix !== 2 && prefix !== 15
}

/**
 * Prepares one `us-atlas` topology for all three contenders: filters to the
 * conterminous US, injects each geometry's FIPS id into its `properties` (the
 * join key Highcharts and ECharts read; the ui module joins on `feature.id`
 * directly), and decodes the GeoJSON view ECharts registers.
 */
function prepareAtlas(raw: unknown, object: string, name: string): MapAtlas {
	const topology = raw as MapTopology

	const collection = topology.objects[object] as {
		geometries: { id?: string | number; properties?: Record<string, unknown> | null }[]
	}

	collection.geometries = collection.geometries.filter((geometry) => conterminous(geometry.id))

	for (const geometry of collection.geometries) {
		geometry.properties = { ...geometry.properties, fips: String(geometry.id) }
	}

	const features = geographyFeatures(topology, object)

	return {
		name,
		topology,
		geoJson: { type: 'FeatureCollection', features },
		ids: features.map((feature) => String(feature.id)),
	}
}

/** The conterminous US states plus DC: 49 regions. */
export const statesAtlas = prepareAtlas(statesRaw, 'states', 'bench-us-states')

/** Every conterminous-US county: 3,108 regions. */
export const countiesAtlas = prepareAtlas(countiesRaw, 'counties', 'bench-us-counties')

/** The categorical zones, in the explicit order every contender's legend shows. */
export const ZONES = ['Pacific', 'Mountain', 'Central', 'Eastern'] as const

/** One explicit colour per zone, shared by the Highcharts and ECharts scales. */
export const ZONE_COLORS = ['#2563eb', '#16a34a', '#d97706', '#dc2626'] as const

/** The five-stop sequential ramp every contender's numeric colour scale samples. */
export const VALUE_RAMP = ['#eff6ff', '#bfdbfe', '#60a5fa', '#2563eb', '#1e3a8a']

/** The numeric values' fixed domain ceiling. */
export const VALUE_MAX = 10_000

/** One categorical row for the ui module's `regionKey` / `categoryKey` join. */
export type ZoneRow = { fips: string; zone: string }

/** A FIPS-keyed numeric row: Highcharts' `joinBy` form, and the ui choropleth's. */
export type JoinRow = { fips: string; value: number }

/** ECharts' name-joined datum form (`nameProperty: 'fips'` reads the same key). */
export type NamedRow = { name: string; value: number }

/**
 * One categorical dataset in every contender's natural shape: typed rows for
 * the ui module, zone indices for Highcharts' data classes and ECharts'
 * pieces. All three views hold the same assignment.
 */
export type ZoneData = {
	rows: ZoneRow[]
	hcRows: JoinRow[]
	ecRows: NamedRow[]
}

/** Assigns every region a zone, LCG-seeded; two seeds give the update flip. */
export function makeZones(atlas: MapAtlas, seed = 1): ZoneData {
	const next = rng(seed)

	const indexes = atlas.ids.map(() => Math.floor(next() * ZONES.length))

	return {
		rows: atlas.ids.map((fips, i) => ({ fips, zone: ZONES[indexes[i] ?? 0] as string })),
		hcRows: atlas.ids.map((fips, i) => ({ fips, value: indexes[i] ?? 0 })),
		ecRows: atlas.ids.map((name, i) => ({ name, value: indexes[i] ?? 0 })),
	}
}

/** One numeric dataset: the same values through each library's join form. */
export type ValueData = {
	rows: JoinRow[]
	hcRows: JoinRow[]
	ecRows: NamedRow[]
}

/** Assigns every region a value in `[0, VALUE_MAX]`, LCG-seeded. */
export function makeValues(atlas: MapAtlas, seed = 1): ValueData {
	const next = rng(seed)

	const values = atlas.ids.map(() => Math.round(next() * VALUE_MAX))

	return {
		rows: atlas.ids.map((fips, i) => ({ fips, value: values[i] ?? 0 })),
		hcRows: atlas.ids.map((fips, i) => ({ fips, value: values[i] ?? 0 })),
		ecRows: atlas.ids.map((name, i) => ({ name, value: values[i] ?? 0 })),
	}
}
