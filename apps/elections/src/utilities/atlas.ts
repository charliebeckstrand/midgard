import { feature } from 'topojson-client'
import type { MapFeatureCollection } from 'ui/map'
import statesAtlas from 'us-atlas/states-10m.json'

type Topology = Parameters<typeof feature>[0]

/**
 * The states of `us-atlas` as one feature collection. The id of each state is
 * its 2-digit FIPS code. The atlas is a file in the package, so the map draws
 * with no request.
 */
export const STATES = feature(
	statesAtlas as unknown as Topology,
	'states',
) as unknown as MapFeatureCollection
