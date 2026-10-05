import type { MapFeatureCollection, MapTopology } from 'ui/modules/map'
import states from 'us-atlas/states-10m.json'
import countries from 'world-atlas/countries-110m.json'
import { decodeRegions } from './places-geography'
import { drawnRegions, type PlaceAtlas } from './places-view'

/**
 * Decodes one atlas as the map draws it.
 *
 * The atlas is a fixed import, so an atlas with no regions is a fault in the
 * package, not a state that the app can show.
 */
function regionsOf(topology: unknown, atlas: PlaceAtlas): MapFeatureCollection {
	// `resolveJsonModule` types the import as its literal shape, which is not
	// assignable to the structural `MapTopology`. The two are the same at runtime.
	const regions = drawnRegions(decodeRegions(topology as MapTopology, atlas))

	if (regions === null) throw new Error(`The ${atlas} atlas holds no regions`)

	return regions
}

/**
 * The regions of each atlas, decoded once for the module.
 *
 * The atlases are part of the code of the app, not a fetch. The first render on
 * the server and the first render in the browser thus both have the geometry.
 * The map paints in its true frame on the first paint, and the opening view, the
 * grouping, and the filter bar are settled from the start. A fetch after
 * hydration showed a skeleton of the United States first, also when the address
 * stated one region.
 *
 * The browser keeps the chunk in its cache with the rest of the code. The
 * 110m world is the coarsest cut that `world-atlas` ships, and the 10m states
 * are the cut that contains its own coastline.
 */
export const ATLASES: Record<PlaceAtlas, MapFeatureCollection> = {
	states: regionsOf(states, 'states'),
	countries: regionsOf(countries, 'countries'),
}
