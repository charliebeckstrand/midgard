/**
 * The engine's entry to prop-supplied geography: TopoJSON and GeoJSON both
 * normalise to one flat feature list here, so nothing downstream asks which
 * form the atlas arrived in.
 */

import { feature } from 'topojson-client'
import type { MapFeature, MapGeography, MapTopology } from '../types'

/**
 * The topology object a name selects, defaulting to the first key — atlas
 * packages lead with their primary layer. `undefined` where the name selects
 * nothing.
 *
 * The default is a public contract (see `MapTopology`), so it is resolved here
 * alone: every reader of an atlas — the geography the plat draws, the codes a
 * territory is cut from — must land on the same layer, or one would draw a
 * different map than the other cuts.
 *
 * @internal
 */
export function topologyObject(
	topology: MapTopology,
	objectName: string | undefined,
): object | undefined {
	const name = objectName ?? Object.keys(topology.objects)[0]

	return name === undefined ? undefined : topology.objects[name]
}

/**
 * Normalises what `topojson-client` hands back to a feature list. It returns a
 * collection for a geometry collection and a lone feature for a lone geometry,
 * and no caller cares which.
 *
 * @internal
 */
export function decodedFeatures(decoded: ReturnType<typeof feature>): MapFeature[] {
	return (decoded.type === 'FeatureCollection'
		? decoded.features
		: [decoded]) as unknown as MapFeature[]
}

/**
 * Normalises prop-supplied geography to a flat feature list: a TopoJSON
 * topology decodes its named object, a GeoJSON collection passes its features
 * through. An unknown object name yields no features.
 *
 * @internal
 */
export function geographyFeatures(geography: MapGeography, objectName?: string): MapFeature[] {
	if (geography.type === 'FeatureCollection') return geography.features

	const object = topologyObject(geography, objectName)

	if (!object) return []

	return decodedFeatures(
		feature(
			geography as unknown as Parameters<typeof feature>[0],
			object as Parameters<typeof feature>[1],
		),
	)
}
