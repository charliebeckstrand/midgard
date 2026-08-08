/**
 * The engine's entry to prop-supplied geography: TopoJSON and GeoJSON both
 * normalise to one flat feature list here, so nothing downstream asks which
 * form the atlas arrived in.
 */

import { feature } from 'topojson-client'
import type { MapFeature, MapGeography } from '../types'

/**
 * Normalises prop-supplied geography to a flat feature list: a TopoJSON
 * topology decodes its named object (defaulting to the first key — atlas
 * packages lead with their primary layer), a GeoJSON collection passes its
 * features through. An unknown object name yields no features.
 *
 * @internal
 */
export function geographyFeatures(geography: MapGeography, objectName?: string): MapFeature[] {
	if (geography.type === 'FeatureCollection') return geography.features

	const name = objectName ?? Object.keys(geography.objects)[0]

	const object = name === undefined ? undefined : geography.objects[name]

	if (!object) return []

	const decoded = feature(
		geography as unknown as Parameters<typeof feature>[0],
		object as Parameters<typeof feature>[1],
	)

	return (decoded.type === 'FeatureCollection'
		? decoded.features
		: [decoded]) as unknown as MapFeature[]
}
